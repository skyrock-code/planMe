import random
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from extensions import db
from models import (
    MealPlan, Meal, MealPlanMeal,
    User, GroceryList, GroceryListItem,
)

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
# Creates a new MealPlan, populates it with
# meals filtered by the user's allergies and
# dietary preferences, respects the budget,
# and auto-generates the grocery list.
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

    # ── Step 1: Load user ─────────────────────────────────────────────
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({"error": "User not found"}), 404

    # ── Step 2-3: Load allergens and diet preferences ─────────────────
    user_allergens = {ua.allergen.lower() for ua in user.allergies}
    user_diets     = {ud.diet_type.lower() for ud in user.diets}

    cooking_frequency = (
        data.get('cooking_frequency')
        or user.cooking_frequency
        or 'every_2_days'
    )
    total_budget = float(data['total_budget'])

    # ── Step 4: Retrieve all available meals ──────────────────────────
    all_meals = Meal.query.all()

    # ── Step 5: Filter by allergies ───────────────────────────────────
    # A meal is safe if none of its ingredients carry a user allergen.
    safe_meals = []
    for meal in all_meals:
        meal_allergens = {
            ia.allergen.lower()
            for mi in meal.ingredients
            for ia in mi.ingredient.allergens
        }
        if not (meal_allergens & user_allergens):
            safe_meals.append(meal)

    # ── Step 6: Filter by dietary preferences ─────────────────────────
    # Only apply diet filter when the user has set preferences.
    # If filtering would leave zero meals, fall back to allergy-safe pool.
    if user_diets:
        diet_filtered = [
            m for m in safe_meals
            if any(tag.diet_type.lower() in user_diets for tag in m.diet_tags)
        ]
        if diet_filtered:
            safe_meals = diet_filtered

    if not safe_meals:
        return jsonify({
            "error": "No suitable meals found matching your allergies and dietary preferences"
        }), 400

    # ── Step 7-8: Build cooking schedule ──────────────────────────────
    # step     = days between cooking sessions
    # duration = how many days one cooked batch covers
    # twice    = cook two separate meals on the same day
    freq_config = {
        'once_daily':   {'step': 1, 'duration': 1, 'twice': False},
        'twice_daily':  {'step': 1, 'duration': 1, 'twice': True},
        'every_2_days': {'step': 2, 'duration': 2, 'twice': False},
        'every_3_days': {'step': 3, 'duration': 3, 'twice': False},
        'flexible':     {'step': 2, 'duration': 2, 'twice': False},
    }
    cfg      = freq_config.get(cooking_frequency, freq_config['every_2_days'])
    step     = cfg['step']
    duration = cfg['duration']
    twice    = cfg['twice']

    # Each entry: (cook_date, actual_duration_days)
    schedule = []
    current = start_date
    while current <= end_date:
        actual_dur = min(duration, (end_date - current).days + 1)
        schedule.append((current, actual_dur))
        if twice:
            schedule.append((current, actual_dur))
        current += timedelta(days=step)

    if not schedule:
        return jsonify({"error": "No cooking days found in the given date range"}), 400

    # ── Create the plan record ────────────────────────────────────────
    plan = MealPlan(
        user_id           = user.user_id,
        start_date        = start_date,
        end_date          = end_date,
        total_budget      = total_budget,
        cooking_frequency = cooking_frequency,
    )
    db.session.add(plan)
    db.session.flush()  # obtain plan.plan_id before commit

    # ── Step 9: Assign meals with budget awareness ────────────────────
    def estimate_cost(meal, dur):
        return round(
            sum(mi.quantity * mi.ingredient.unit_price_xaf for mi in meal.ingredients) * dur,
            2
        )

    remaining_budget = total_budget
    assignments      = []
    last_meal_id     = None

    for cook_date, dur in schedule:
        # Prefer meals within remaining budget; fall back to cheapest if none fit
        affordable = [m for m in safe_meals if estimate_cost(m, dur) <= remaining_budget]
        if not affordable:
            affordable = sorted(safe_meals, key=lambda m: estimate_cost(m, dur))[:3]

        # Avoid repeating the immediately previous meal when possible
        candidates = affordable
        if len(affordable) > 1 and last_meal_id is not None:
            no_repeat = [m for m in affordable if m.meal_id != last_meal_id]
            if no_repeat:
                candidates = no_repeat

        chosen = random.choice(candidates)
        cost   = estimate_cost(chosen, dur)

        db.session.add(MealPlanMeal(
            plan_id       = plan.plan_id,
            meal_id       = chosen.meal_id,
            start_date    = cook_date,
            duration_days = dur,
        ))
        assignments.append({'meal_id': chosen.meal_id, 'cost': cost, 'duration_days': dur})
        remaining_budget -= cost
        last_meal_id = chosen.meal_id

    if not assignments:
        db.session.rollback()
        return jsonify({"error": "Could not schedule any meals. Try a higher budget or fewer diet restrictions."}), 400

    # ── Step 10: Generate grocery list ───────────────────────────────
    grocery_list = GroceryList(plan_id=plan.plan_id, total_price=0.0)
    db.session.add(grocery_list)
    db.session.flush()

    grocery_map = {}
    for a in assignments:
        meal = Meal.query.get(a['meal_id'])
        for mi in meal.ingredients:
            ing  = mi.ingredient
            qty  = round(mi.quantity * a['duration_days'], 3)
            cost = round(qty * ing.unit_price_xaf, 2)
            if ing.id in grocery_map:
                grocery_map[ing.id]['quantity']    += qty
                grocery_map[ing.id]['total_price'] += cost
            else:
                grocery_map[ing.id] = {
                    'quantity':    qty,
                    'unit':        ing.market_unit,
                    'unit_price':  ing.unit_price_xaf,
                    'total_price': cost,
                }

    total_cost = 0.0
    for ing_id, item in grocery_map.items():
        item['quantity']    = round(item['quantity'],    3)
        item['total_price'] = round(item['total_price'], 2)
        total_cost += item['total_price']
        db.session.add(GroceryListItem(
            list_id       = grocery_list.list_id,
            ingredient_id = ing_id,
            quantity      = item['quantity'],
            unit          = item['unit'],
            unit_price    = item['unit_price'],
            total_price   = item['total_price'],
            is_custom     = False,
        ))

    grocery_list.total_price = round(total_cost, 2)
    db.session.commit()

    return jsonify({
        "message":         "Meal plan generated successfully",
        "plan_id":         plan.plan_id,
        "meals_assigned":  len(assignments),
        "estimated_cost":  round(total_cost, 2),
        "total_budget":    total_budget,
        "within_budget":   round(total_cost, 2) <= total_budget,
        "grocery_list_id": grocery_list.list_id,
        "filters_applied": {
            "allergens_excluded": sorted(user_allergens),
            "diet_preferences":   sorted(user_diets),
            "cooking_frequency":  cooking_frequency,
        },
    }), 201