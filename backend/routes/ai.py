from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from extensions import db
from models import MealPlan, MealPlanMeal, User
from services.meal_filter_service import MealFilterService
from services.ai_intent_service import AIIntentService

ai_bp = Blueprint("ai", __name__)


# ─────────────────────────────────────────
# AI GENERATE PLAN FROM NATURAL LANGUAGE
# POST /api/ai/generate-from-prompt
# ─────────────────────────────────────────
@ai_bp.route("/generate-from-prompt", methods=["POST"])
@jwt_required()
def generate_plan_from_prompt():
    """
    Generates a meal plan from natural language input.

    Request body:
    {
      "user_id":           int,
      "prompt":            str,
      "total_budget":      float,
      "start_date":        "YYYY-MM-DD",
      "end_date":          "YYYY-MM-DD",
      "cooking_frequency": str (optional, defaults to "every_2_days")
    }

    Response:
    {
      "message":     str,
      "plan_id":     int,
      "ai_used":     bool,  (true if AI selected meals, false if fallback)
      "grocery_url": str
    }
    """
    current_user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    # ── Validate input ────────────────────────────────────────────
    required = ["user_id", "prompt", "total_budget", "start_date", "end_date"]
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing required fields"}), 400

    # Verify user is requesting their own plan
    if data["user_id"] != current_user_id:
        return jsonify({"error": "Access denied"}), 403

    user = User.query.get(data["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Parse dates
    try:
        start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        end_date = datetime.strptime(data["end_date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if end_date <= start_date:
        return jsonify({"error": "end_date must be after start_date"}), 400

    total_budget = float(data["total_budget"])
    prompt = data["prompt"].strip()
    cooking_frequency = data.get("cooking_frequency", "every_2_days")

    # ── STEP 1: Create the MealPlan record ────────────────────────
    plan = MealPlan(
        user_id=data["user_id"],
        start_date=start_date,
        end_date=end_date,
        total_budget=total_budget,
        cooking_frequency=cooking_frequency,
    )
    db.session.add(plan)
    db.session.commit()

    # ── STEP 2: Get safe meals (allergies/diets filtered) ─────────
    service = MealFilterService()
    safe_meals = service.get_eligible_meals(data["user_id"])
    if not safe_meals:
        db.session.delete(plan)
        db.session.commit()
        return jsonify({
            "error": "No meals available matching your dietary profile"
        }), 400

    # ── STEP 3: Call AI to get preferred meal_ids ─────────────────
    preferred_meal_ids = None
    ai_used = False
    try:
        ai_service = AIIntentService()
        preferred_meal_ids = ai_service.select_meals(prompt, safe_meals)
        if preferred_meal_ids:
            ai_used = True
    except Exception as exc:
        print(f"[ai.py] AI meal selection failed: {exc}")
        preferred_meal_ids = None

    # ── STEP 4: Schedule using rule-based planner ─────────────────
    schedule = service.generate_weekly_plan(
        user_id=data["user_id"],
        budget=total_budget,
        cooking_frequency=cooking_frequency,
        start_date=start_date,
        end_date=end_date,
        preferred_meal_ids=preferred_meal_ids,
    )

    if not schedule:
        db.session.delete(plan)
        db.session.commit()
        return jsonify({
            "error": "Could not schedule meals. Try a higher budget or fewer restrictions."
        }), 400

    # ── STEP 5: Persist MealPlanMeal records ──────────────────────
    for slot in schedule:
        db.session.add(MealPlanMeal(
            plan_id=plan.plan_id,
            meal_id=slot["meal_id"],
            start_date=slot["date"],
            duration_days=slot["duration_days"],
        ))

    db.session.commit()

    # ── STEP 6: Return response ───────────────────────────────────
    return jsonify({
        "message": "AI meal plan generated",
        "plan_id": plan.plan_id,
        "ai_used": ai_used,
        "grocery_url": f"/api/grocery/{plan.plan_id}",
    }), 201
