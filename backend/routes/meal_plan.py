from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from extensions import db
from models import (
    MealPlan, Meal, MealPlanMeal,
    User, UserIngredient,
)
from services.meal_filter_service import MealFilterService

meal_plan_bp = Blueprint('meal_plan', __name__)


# ─────────────────────────────────────────
# HELPER: increment plan counters for always-at-home ingredients
# ─────────────────────────────────────────
def increment_at_home_counters(user_id):
    """
    Increments plan_counter for every always-at-home ingredient of this user.
    Returns a list of ingredient names whose counter has reached 7,
    indicating the user should be asked whether they still have them.
    """
    user_ingredients = UserIngredient.query.filter_by(
        user_id=user_id,
        always_at_home=True,
    ).all()

    needs_review = []
    for ui in user_ingredients:
        ui.plan_counter += 1
        if ui.plan_counter >= 7:
            needs_review.append(ui.ingredient_name)

    db.session.commit()
    return needs_review


# ─────────────────────────────────────────
# HELPER: check for day overlap in a plan
# ─────────────────────────────────────────
def get_occupied_dates(plan_id):
    """
    Returns a set of all dates already occupied in a plan,
    accounting for duration_days spanning multiple days.
    """
    assignments = MealPlanMeal.query.filter_by(plan_id=plan_id).all()
    occupied = set()
    for a in assignments:
        for i in range(a.duration_days):
            occupied.add(a.start_date + timedelta(days=i))
    return occupied


# ─────────────────────────────────────────
# CREATE MEAL PLAN
# POST /api/meal_plan/
# ─────────────────────────────────────────
@meal_plan_bp.route('/', methods=['POST'])
def create_plan():
    data = request.get_json()

    required = ['user_id', 'start_date', 'end_date', 'total_budget']
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        start_date = datetime.strptime(data['start_date'], "%Y-%m-%d").date()
        end_date   = datetime.strptime(data['end_date'],   "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if end_date <= start_date:
        return jsonify({"error": "end_date must be after start_date"}), 400

    plan = MealPlan(
        user_id            = data['user_id'],
        start_date         = start_date,
        end_date           = end_date,
        total_budget       = data['total_budget'],
        # Optional: defaults to "every_2_days" if not provided
        # Allowed values: once_daily, twice_daily, every_2_days, every_3_days, flexible
        cooking_frequency  = data.get('cooking_frequency', 'every_2_days'),
    )

    db.session.add(plan)
    db.session.commit()

    return jsonify({
        "message": "Meal plan created",
        "plan_id": plan.plan_id
    }), 201


# ─────────────────────────────────────────
# GET ALL PLANS FOR A USER
# GET /api/meal_plan/user/<user_id>
# ─────────────────────────────────────────
@meal_plan_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_plans(user_id):
    plans = MealPlan.query.filter_by(user_id=user_id).all()

    result = [
        {
            "plan_id":           p.plan_id,
            "start_date":        str(p.start_date),
            "end_date":          str(p.end_date),
            "total_budget":      p.total_budget,
            "cooking_frequency": p.cooking_frequency,
            "created_at":        str(p.created_at),
        }
        for p in plans
    ]

    return jsonify(result), 200


# ─────────────────────────────────────────
# ASSIGN MEAL TO PLAN
# POST /api/meal_plan/assign
# ─────────────────────────────────────────
@meal_plan_bp.route('/assign', methods=['POST'])
def assign_meal():
    data = request.get_json()

    required = ['plan_id', 'meal_id', 'start_date', 'duration_days']
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        start_date = datetime.strptime(data['start_date'], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    duration_days = data['duration_days']
    if duration_days < 1 or duration_days > 3:
        return jsonify({"error": "Duration must be between 1 and 3 days"}), 400

    # Check plan exists
    plan = MealPlan.query.get(data['plan_id'])
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404

    # Check meal exists
    meal = Meal.query.get(data['meal_id'])
    if not meal:
        return jsonify({"error": "Meal not found"}), 404

    # Check start_date is within plan range
    if not (plan.start_date <= start_date <= plan.end_date):
        return jsonify({"error": "start_date is outside the plan's date range"}), 400

    # ── Overlap detection ──────────────────────────────────────────────
    # Build the set of days this meal would occupy
    new_days = {start_date + timedelta(days=i) for i in range(duration_days)}

    # Get all days already taken in this plan
    occupied = get_occupied_dates(data['plan_id'])

    overlap = new_days & occupied   # intersection
    if overlap:
        conflicting = sorted(str(d) for d in overlap)
        return jsonify({
            "error":             "Date conflict — those days are already assigned",
            "conflicting_dates": conflicting
        }), 409
    # ──────────────────────────────────────────────────────────────────

    assignment = MealPlanMeal(
        plan_id       = data['plan_id'],
        meal_id       = data['meal_id'],
        start_date    = start_date,
        duration_days = duration_days,
    )

    db.session.add(assignment)
    db.session.commit()

    return jsonify({"message": "Meal assigned successfully"}), 201


# ─────────────────────────────────────────
# GET ALL MEALS IN A PLAN
# GET /api/meal_plan/<plan_id>/meals
# ─────────────────────────────────────────
@meal_plan_bp.route('/<int:plan_id>/meals', methods=['GET'])
def get_plan_meals(plan_id):
    plan = MealPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404

    assignments = MealPlanMeal.query.filter_by(plan_id=plan_id).all()

    result = [
        {
            "meal_id":       a.meal_id,
            "meal_name":     a.meal.meal_name,
            "start_date":    str(a.start_date),
            "duration_days": a.duration_days,
            "ends_on":       str(a.start_date + timedelta(days=a.duration_days - 1)),
        }
        for a in assignments
    ]

    # Return the plan details along with its meals so the frontend
    # can access `cooking_frequency` alongside the assigned meals.
    return jsonify({
        "plan_id":           plan.plan_id,
        "start_date":        str(plan.start_date),
        "end_date":          str(plan.end_date),
        "total_budget":      plan.total_budget,
        "cooking_frequency": plan.cooking_frequency,
        "meals":             result
    }), 200


# ─────────────────────────────────────────
# DELETE A PLAN
# DELETE /api/meal_plan/<plan_id>
# ─────────────────────────────────────────
@meal_plan_bp.route('/<int:plan_id>', methods=['DELETE'])
def delete_plan(plan_id):
    plan = MealPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404

    db.session.delete(plan)   # cascade handles MealPlanMeal + GroceryList
    db.session.commit()

    return jsonify({"message": "Meal plan deleted"}), 200


# ─────────────────────────────────────────
# SWAP A SINGLE MEAL IN A PLAN
# PUT /api/meal_plan/swap
# Replaces one meal in a plan with another
# without affecting other meals in the plan
# ─────────────────────────────────────────
@meal_plan_bp.route('/swap', methods=['PUT'])
def swap_meal():
    """
    Swaps a single meal in a plan with a new meal.
    Only the specified meal_id on the specified start_date
    is replaced — all other meals in the plan are untouched.

    Request body:
    {
        "plan_id":     int,
        "old_meal_id": int,
        "new_meal_id": int,
        "start_date":  str (YYYY-MM-DD)
    }
    """
    data = request.get_json()

    required = ['plan_id', 'old_meal_id', 'new_meal_id', 'start_date']
    if not all(data.get(f) for f in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        start_date = datetime.strptime(
            data['start_date'], "%Y-%m-%d"
        ).date()
    except ValueError:
        return jsonify({
            "error": "Invalid date format. Use YYYY-MM-DD"
        }), 400

    # Find the specific meal assignment to replace
    assignment = MealPlanMeal.query.filter_by(
        plan_id    = data['plan_id'],
        meal_id    = data['old_meal_id'],
        start_date = start_date
    ).first()

    if not assignment:
        return jsonify({
            "error": "Meal assignment not found"
        }), 404

    # Verify the replacement meal exists
    new_meal = Meal.query.get(data['new_meal_id'])
    if not new_meal:
        return jsonify({"error": "Replacement meal not found"}), 404

    # Swap: update meal_id, keep start_date and duration_days unchanged
    assignment.meal_id = data['new_meal_id']
    db.session.commit()

    return jsonify({
        "message":      "Meal swapped successfully",
        "plan_id":      data['plan_id'],
        "new_meal_id":  data['new_meal_id'],
        "new_meal_name": new_meal.meal_name,
        "start_date":   str(start_date),
    }), 200


# ─────────────────────────────────────────
# GENERATE MEAL PLAN AUTOMATICALLY
# POST /api/meal_plan/generate
#
# Delegates filtering and schedule generation
# to MealFilterService, then persists the
# result and builds the grocery list.
#
# Request body:
# {
#   "user_id":           int,
#   "start_date":        "YYYY-MM-DD",
#   "end_date":          "YYYY-MM-DD",
#   "total_budget":      float,
#   "cooking_frequency": str  (optional, defaults to user profile value)
# }
# ─────────────────────────────────────────
@meal_plan_bp.route('/generate', methods=['POST'])
def generate_plan():
    data = request.get_json()

    required = ['user_id', 'start_date', 'end_date', 'total_budget']
    if not all(data.get(f) is not None for f in required):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        start_date = datetime.strptime(data['start_date'], "%Y-%m-%d").date()
        end_date   = datetime.strptime(data['end_date'],   "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if end_date <= start_date:
        return jsonify({"error": "end_date must be after start_date"}), 400

    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({"error": "User not found"}), 404

    cooking_frequency = (
        data.get('cooking_frequency')
        or user.cooking_frequency
        or 'every_2_days'
    )
    total_budget = float(data['total_budget'])

    service = MealFilterService()

    # Validate that at least one eligible meal exists before creating a plan
    if not service.get_eligible_meals(user.user_id):
        return jsonify({
            "error": "No suitable meals found matching your allergies and dietary preferences"
        }), 400

    # Delegate schedule generation to the service
    schedule = service.generate_weekly_plan(
        user_id           = user.user_id,
        budget            = total_budget,
        cooking_frequency = cooking_frequency,
        start_date        = start_date,
        end_date          = end_date,
    )

    if not schedule:
        return jsonify({
            "error": "Could not schedule any meals. Try a higher budget or fewer diet restrictions."
        }), 400

    # ── Persist the plan ──────────────────────────────────────────────
    plan = MealPlan(
        user_id           = user.user_id,
        start_date        = start_date,
        end_date          = end_date,
        total_budget      = total_budget,
        cooking_frequency = cooking_frequency,
    )
    db.session.add(plan)
    db.session.flush()

    for slot in schedule:
        db.session.add(MealPlanMeal(
            plan_id       = plan.plan_id,
            meal_id       = slot['meal_id'],
            start_date    = slot['date'],
            duration_days = slot['duration_days'],
        ))

    db.session.commit()

    needs_review = increment_at_home_counters(user.user_id)

    response_data = {
        "message":        "Meal plan generated successfully",
        "plan_id":        plan.plan_id,
        "meals_assigned": len(schedule),
        "total_budget":   total_budget,
        "grocery_url":    f"/api/grocery/{plan.plan_id}",
        "filters_applied": {
            "allergens_excluded": sorted({ua.allergen.lower() for ua in user.allergies}),
            "diet_preferences":   sorted({ud.diet_type.lower() for ud in user.diets}),
            "cooking_frequency":  cooking_frequency,
        },
    }

    if needs_review:
        response_data["needs_review"] = needs_review
        response_data["review_message"] = (
            f"Do you still have {', '.join(needs_review)} at home?"
        )

    return jsonify(response_data), 201