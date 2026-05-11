from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from extensions import db
from models import MealPlan, Meal, MealPlanMeal

meal_plan_bp = Blueprint('meal_plan', __name__)


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
        user_id      = data['user_id'],
        start_date   = start_date,
        end_date     = end_date,
        total_budget = data['total_budget'],
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
            "plan_id":      p.plan_id,
            "start_date":   str(p.start_date),
            "end_date":     str(p.end_date),
            "total_budget": p.total_budget,
            "created_at":   str(p.created_at),
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

    return jsonify(result), 200


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