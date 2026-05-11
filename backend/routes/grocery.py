from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    MealPlan,
    MealPlanMeal,
    Meal,
    MealIngredient,
    GroceryList,
    GroceryListItem,
    UserIngredient,
)

grocery_bp = Blueprint("grocery", __name__)


# ─────────────────────────────────────────
# HELPER: recalculate and save list total
# ─────────────────────────────────────────
def recalculate_total(grocery_list):
    grocery_list.total_price = round(
        sum(item.total_price for item in grocery_list.items), 2
    )
    db.session.commit()


# ─────────────────────────────────────────
# GENERATE GROCERY LIST
# GET /api/grocery/<plan_id>
# ─────────────────────────────────────────
@grocery_bp.route("/<int:plan_id>", methods=["GET"])
def generate_grocery_list(plan_id):

    plan = MealPlan.query.get(plan_id)
    if not plan:
        return jsonify({"error": "Meal plan not found"}), 404

    plan_meals = MealPlanMeal.query.filter_by(plan_id=plan_id).all()
    if not plan_meals:
        return jsonify({"error": "No meals assigned to this plan yet"}), 404

    # Get or create grocery list
    grocery_list = GroceryList.query.filter_by(plan_id=plan_id).first()
    if not grocery_list:
        grocery_list = GroceryList(plan_id=plan_id)
        db.session.add(grocery_list)
        db.session.commit()

    # Aggregate ingredients
    grocery_map = {}

    for plan_meal in plan_meals:
        meal = Meal.query.get(plan_meal.meal_id)
        if not meal:
            continue

        scale = meal.servings * plan_meal.duration_days

        for mi in meal.ingredients:
            ingredient  = mi.ingredient
            total_qty   = mi.quantity * scale
            total_price = ingredient.estimated_price * total_qty

            if ingredient.ingredient_id in grocery_map:
                grocery_map[ingredient.ingredient_id]["quantity"]    += total_qty
                grocery_map[ingredient.ingredient_id]["total_price"] += total_price
            else:
                grocery_map[ingredient.ingredient_id] = {
                    "ingredient_id": ingredient.ingredient_id,
                    "name":          ingredient.ingredient_name,
                    "unit":          ingredient.unit,
                    "unit_price":    ingredient.estimated_price,
                    "quantity":      total_qty,
                    "total_price":   total_price,
                    "is_custom":     False,
                }

    # Clear existing auto-generated items (keep custom items the user added)
    GroceryListItem.query.filter_by(
        list_id=grocery_list.list_id, is_custom=False
    ).delete()

    # Save aggregated items
    for ingredient_id, data in grocery_map.items():
        item = GroceryListItem(
            list_id       = grocery_list.list_id,
            ingredient_id = ingredient_id,
            quantity      = round(data["quantity"], 3),
            unit          = data["unit"],
            unit_price    = data["unit_price"],
            total_price   = round(data["total_price"], 2),
            is_custom     = False,
        )
        db.session.add(item)

    db.session.commit()
    recalculate_total(grocery_list)

    return jsonify({
        "plan_id":       plan_id,
        "list_id":       grocery_list.list_id,
        "total_price":   grocery_list.total_price,
        "within_budget": grocery_list.total_price <= plan.total_budget,
        "budget":        plan.total_budget,
        "items":         grocery_map_to_list(grocery_list),
    }), 200


# ─────────────────────────────────────────
# GET SAVED GROCERY LIST
# GET /api/grocery/<plan_id>/saved
# ─────────────────────────────────────────
@grocery_bp.route("/<int:plan_id>/saved", methods=["GET"])
def get_saved_grocery_list(plan_id):

    plan         = MealPlan.query.get(plan_id)
    grocery_list = GroceryList.query.filter_by(plan_id=plan_id).first()

    if not grocery_list:
        return jsonify({"error": "No grocery list found. Generate one first."}), 404

    return jsonify({
        "plan_id":       plan_id,
        "list_id":       grocery_list.list_id,
        "created_at":    str(grocery_list.created_at),
        "total_price":   grocery_list.total_price,
        "within_budget": grocery_list.total_price <= plan.total_budget,
        "budget":        plan.total_budget,
        "items":         grocery_map_to_list(grocery_list),
    }), 200


# ─────────────────────────────────────────
# UPDATE ITEM QUANTITY
# PATCH /api/grocery/item/<item_id>
# body: { "quantity": 3.0 }
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>", methods=["PATCH"])
def update_item_quantity(item_id):

    item = GroceryListItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data     = request.get_json()
    quantity = data.get("quantity")

    if quantity is None or quantity <= 0:
        return jsonify({"error": "A valid quantity greater than 0 is required"}), 400

    item.quantity    = quantity
    item.total_price = round(item.unit_price * quantity, 2)

    db.session.commit()
    recalculate_total(item.grocery_list)

    return jsonify({"message": "Quantity updated", "item_id": item_id}), 200


# ─────────────────────────────────────────
# REMOVE ITEM FROM LIST
# DELETE /api/grocery/item/<item_id>
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>", methods=["DELETE"])
def remove_item(item_id):

    item = GroceryListItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    grocery_list = item.grocery_list
    db.session.delete(item)
    db.session.commit()
    recalculate_total(grocery_list)

    return jsonify({"message": "Item removed"}), 200


# ─────────────────────────────────────────
# ADD CUSTOM INGREDIENT TO LIST
# POST /api/grocery/<list_id>/add
# body: {
#   "name": "Maggi cubes",
#   "unit": "pack",
#   "unit_price": 100,
#   "quantity": 2,
#   "save_to_profile": true,   ← optional: saves to user's personal list
#   "user_id": 1               ← required only if save_to_profile is true
# }
# ─────────────────────────────────────────
@grocery_bp.route("/<int:list_id>/add", methods=["POST"])
def add_custom_ingredient(list_id):

    grocery_list = GroceryList.query.get(list_id)
    if not grocery_list:
        return jsonify({"error": "Grocery list not found"}), 404

    data = request.get_json()

    required = ["name", "unit_price", "quantity"]
    if not all(data.get(f) for f in required):
        return jsonify({"error": "name, unit_price and quantity are required"}), 400

    quantity    = data["quantity"]
    unit_price  = data["unit_price"]
    total_price = round(unit_price * quantity, 2)

    # Add to grocery list as a custom item
    item = GroceryListItem(
        list_id       = list_id,
        ingredient_id = None,                    # no FK — it's custom
        custom_name   = data["name"],
        quantity      = quantity,
        unit          = data.get("unit"),
        unit_price    = unit_price,
        total_price   = total_price,
        is_custom     = True,
    )
    db.session.add(item)
    db.session.commit()
    recalculate_total(grocery_list)

    # Optionally save to user's personal ingredient list
    if data.get("save_to_profile") and data.get("user_id"):
        already_saved = UserIngredient.query.filter_by(
            user_id         = data["user_id"],
            ingredient_name = data["name"]
        ).first()

        if not already_saved:
            saved = UserIngredient(
                user_id         = data["user_id"],
                ingredient_name = data["name"],
                unit            = data.get("unit"),
                estimated_price = unit_price,
            )
            db.session.add(saved)
            db.session.commit()

    return jsonify({
        "message":    "Custom ingredient added",
        "item_id":    item.item_id,
        "saved_to_profile": bool(data.get("save_to_profile")),
    }), 201


# ─────────────────────────────────────────
# GET USER'S PERSONAL SAVED INGREDIENTS
# GET /api/grocery/personal/<user_id>
# ─────────────────────────────────────────
@grocery_bp.route("/personal/<int:user_id>", methods=["GET"])
def get_personal_ingredients(user_id):

    saved = UserIngredient.query.filter_by(user_id=user_id).all()

    result = [
        {
            "id":              s.id,
            "ingredient_name": s.ingredient_name,
            "unit":            s.unit,
            "estimated_price": s.estimated_price,
        }
        for s in saved
    ]

    return jsonify(result), 200


# ─────────────────────────────────────────
# DELETE A PERSONAL SAVED INGREDIENT
# DELETE /api/grocery/personal/item/<id>
# ─────────────────────────────────────────
@grocery_bp.route("/personal/item/<int:id>", methods=["DELETE"])
def delete_personal_ingredient(id):

    item = UserIngredient.query.get(id)
    if not item:
        return jsonify({"error": "Saved ingredient not found"}), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({"message": "Saved ingredient removed"}), 200


# ─────────────────────────────────────────
# HELPER: serialize grocery list items
# ─────────────────────────────────────────
def grocery_map_to_list(grocery_list):
    result = []
    for item in grocery_list.items:
        result.append({
            "item_id":     item.item_id,
            "name":        item.ingredient.ingredient_name if item.ingredient else item.custom_name,
            "unit":        item.unit,
            "unit_price":  item.unit_price,
            "quantity":    item.quantity,
            "total_price": item.total_price,
            "is_custom":   item.is_custom,
        })
    return result