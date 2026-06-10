import json
import re
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models import MealPlan, MealPlanMeal, User
from services.meal_filter_service import MealFilterService

ai_bp = Blueprint("ai", __name__)


# ─────────────────────────────────────────
# HELPER: call AI model
#
# Isolated so the provider can be swapped
# without touching the route logic.
# ─────────────────────────────────────────
def call_ai_model(system_prompt: str, user_message: str, max_tokens: int = 1024) -> str:
    """
    Sends a chat-completion request to Qwen/Qwen2.5-7B-Instruct
    via the Hugging Face Inference API.

    Returns the raw model response string.
    Raises RuntimeError when HF_TOKEN is absent.
    Raises any huggingface_hub exception on network/API failure.
    """
    from huggingface_hub import InferenceClient

    token = current_app.config.get("HF_TOKEN", "")
    if not token:
        raise RuntimeError(
            "HF_TOKEN is not configured on the server. "
            "Set the HF_TOKEN environment variable."
        )

    client = InferenceClient(
        model="Qwen/Qwen2.5-7B-Instruct",
        token=token,
    )

    response = client.chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content


# ─────────────────────────────────────────
# HELPER: strip markdown fences
# ─────────────────────────────────────────
def strip_markdown_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers from model output."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


# ─────────────────────────────────────────
# AI GENERATE MEAL PLAN
# POST /api/ai/generate-plan
# ─────────────────────────────────────────
@ai_bp.route("/generate-plan", methods=["POST"])
@jwt_required()
def ai_generate_plan():
    # JWT identity is stored as str(user_id) — cast when comparing
    current_user_id = int(get_jwt_identity())

    data    = request.get_json() or {}
    plan_id = data.get("plan_id")
    prompt  = (data.get("prompt") or "").strip()

    if not plan_id:
        return jsonify({"error": "plan_id is required"}), 400
    if not prompt:
        return jsonify({"error": "prompt is required"}), 400

    # ── Verify plan exists and belongs to this user ──────────────────
    plan = MealPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404
    if plan.user_id != current_user_id:
        return jsonify({"error": "Access denied — this plan belongs to another user"}), 403

    # ── Step 1: Build safe meal list ─────────────────────────────────
    service    = MealFilterService()
    safe_meals = service.get_eligible_meals(plan.user_id)

    if not safe_meals:
        return jsonify({
            "error": (
                "No meals are available for your dietary profile. "
                "Please update your allergy or diet settings."
            )
        }), 400

    safe_meal_ids = {m.meal_id for m in safe_meals}

    safe_meals_payload = []
    for meal in safe_meals:
        base_cost = service.estimate_meal_cost(meal.meal_id)
        safe_meals_payload.append({
            "meal_id":          meal.meal_id,
            "meal_name":        meal.meal_name,
            "total_cost_xaf":   base_cost,
            "cost_per_serving": round(base_cost / meal.servings, 2) if meal.servings else base_cost,
            "servings":         meal.servings,
        })

    # ── Step 2: Build context and call the model ──────────────────────
    user       = User.query.get(plan.user_id)
    diet_prefs = [ud.diet_type for ud in user.diets] if user else []
    total_days = (plan.end_date - plan.start_date).days + 1

    system_prompt = (
        "You are a meal planning assistant for Cameroonian home cooks. "
        "Respond only with valid JSON. No explanation, no markdown, raw JSON only."
    )

    user_message = (
        f"Budget: {plan.total_budget} XAF\n"
        f"Start date: {plan.start_date}\n"
        f"End date: {plan.end_date}\n"
        f"Total days: {total_days}\n"
        f"Diet preferences: {', '.join(diet_prefs) if diet_prefs else 'none'}\n"
        f"User request: {prompt}\n\n"
        "Rules:\n"
        "- Assign one meal per cooking session.\n"
        "- A meal can cover 1–3 consecutive days (duration_days).\n"
        "- No two meals may overlap on the same date.\n"
        f"- All start_date values must be within {plan.start_date} and {plan.end_date}.\n"
        "- Each meal must have a different start_date.\n"
        "- The total cost (sum of total_cost_xaf × duration_days per meal) "
        "should not exceed the budget.\n\n"
        "Available meals:\n"
        f"{json.dumps(safe_meals_payload, ensure_ascii=False)}\n\n"
        "Respond with this exact JSON structure, nothing else:\n"
        '{"plan": [{"meal_id": <int>, "meal_name": <str>, '
        '"start_date": "YYYY-MM-DD", "duration_days": <int>}], '
        '"total_cost_xaf": <float>, "reasoning": <str>}'
    )

    ai_data      = None
    fallback_reason = None

    try:
        raw_response = call_ai_model(system_prompt, user_message, max_tokens=1024)

        # ── Step 3: Parse and validate ────────────────────────────────
        cleaned = strip_markdown_fences(raw_response)
        ai_data = json.loads(cleaned)

        if "plan" not in ai_data or not isinstance(ai_data["plan"], list):
            raise ValueError('Model response missing "plan" array')

        validation_errors = []
        occupied_days: set = set()

        for idx, item in enumerate(ai_data["plan"]):
            label = f"plan[{idx}]"

            mid = item.get("meal_id")
            if not isinstance(mid, int) or mid not in safe_meal_ids:
                validation_errors.append(f"{label}: meal_id {mid!r} not in safe meals")
                continue

            dur = item.get("duration_days", 1)
            if not isinstance(dur, int) or not (1 <= dur <= 3):
                validation_errors.append(f"{label}: duration_days must be 1–3, got {dur!r}")
                continue

            try:
                slot_start = datetime.strptime(item["start_date"], "%Y-%m-%d").date()
            except (KeyError, ValueError):
                validation_errors.append(f"{label}: invalid or missing start_date")
                continue

            if not (plan.start_date <= slot_start <= plan.end_date):
                validation_errors.append(
                    f"{label}: start_date {slot_start} outside plan range"
                )
                continue

            slot_days = {slot_start + timedelta(days=i) for i in range(dur)}
            overlap   = slot_days & occupied_days
            if overlap:
                validation_errors.append(f"{label}: date overlap on {sorted(str(d) for d in overlap)}")
                continue

            occupied_days |= slot_days

        ai_total = float(ai_data.get("total_cost_xaf", 0))
        if ai_total > plan.total_budget * 1.05:
            validation_errors.append(
                f"total_cost_xaf {ai_total:.2f} exceeds budget {plan.total_budget * 1.05:.2f}"
            )

        if validation_errors:
            raise ValueError(f"Validation failed: {validation_errors}")

    except Exception as exc:
        # AI call failed or response was invalid — fall back to rule-based
        print(f"[ai.py] AI generation failed, using rule-based fallback: {exc}")
        fallback_reason = str(exc)
        ai_data = None

    # ── Step 4: Persist ───────────────────────────────────────────────
    MealPlanMeal.query.filter_by(plan_id=plan_id).delete(synchronize_session=False)
    db.session.flush()

    if ai_data:
        # AI succeeded — persist AI-chosen meals
        for item in ai_data["plan"]:
            slot_start = datetime.strptime(item["start_date"], "%Y-%m-%d").date()
            db.session.add(MealPlanMeal(
                plan_id       = plan_id,
                meal_id       = item["meal_id"],
                start_date    = slot_start,
                duration_days = item["duration_days"],
            ))
        db.session.commit()

        ai_total = float(ai_data.get("total_cost_xaf", 0))
        return jsonify({
            "message":        "Meal plan generated successfully",
            "plan_id":        plan_id,
            "total_cost_xaf": ai_total,
            "within_budget":  ai_total <= plan.total_budget,
            "budget_xaf":     plan.total_budget,
            "reasoning":      ai_data.get("reasoning", ""),
            "meals":          ai_data["plan"],
        }), 201

    else:
        # Parse session preference chips from the prompt when AI is unavailable.
        # Prompt format from frontend: "User prefers: vegetarian, spicy" (comma-separated)
        extra_prefs = []
        if prompt.lower().startswith("user prefers:"):
            raw = prompt[len("user prefers:"):].strip()
            extra_prefs = [p.strip() for p in raw.split(",") if p.strip()]

        # Fallback: use MealFilterService rule-based schedule, honouring chip prefs
        schedule = service.generate_weekly_plan(
            user_id           = plan.user_id,
            budget            = plan.total_budget,
            cooking_frequency = plan.cooking_frequency or "every_2_days",
            start_date        = plan.start_date,
            end_date          = plan.end_date,
            extra_prefs       = extra_prefs or None,
        )

        for slot in schedule:
            db.session.add(MealPlanMeal(
                plan_id       = plan_id,
                meal_id       = slot["meal_id"],
                start_date    = slot["date"],
                duration_days = slot["duration_days"],
            ))
        db.session.commit()

        return jsonify({
            "message":        "Meal plan generated (AI unavailable — rule-based fallback used)",
            "plan_id":        plan_id,
            "total_cost_xaf": 0,
            "within_budget":  True,
            "reasoning":      f"Fallback reason: {fallback_reason}",
            "meals":          [
                {"meal_id": s["meal_id"], "start_date": str(s["date"]), "duration_days": s["duration_days"]}
                for s in schedule
            ],
        }), 201
