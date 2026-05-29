from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    MealPlan,
    MealPlanMeal,
    Meal,
    GroceryList,
    GroceryListItem,
    Ingredient,
    UserIngredient,
)

grocery_bp = Blueprint("grocery", __name__)


# ─────────────────────────────────────────
# HELPER: RECALCULATE GROCERY LIST TOTAL
# ─────────────────────────────────────────
def recalculate_total(grocery_list):
    grocery_list.total_price = round(
        sum(item.total_price for item in grocery_list.items),
        2
    )
    db.session.commit()


# ─────────────────────────────────────────
# HELPER: SERIALIZE ITEMS
# ─────────────────────────────────────────
def serialize_items(grocery_list):
    """
    Serializes all items in a grocery list into a list of dicts.
    Handles both standard database ingredients and custom user items.
    """
    return [
        {
            "item_id":     item.item_id,
            "name":
                item.ingredient.name
                if item.ingredient
                else item.custom_name,
            "unit":        item.unit,
            "unit_price":  item.unit_price,
            "quantity":    item.quantity,
            "total_price": item.total_price,
            "is_custom":   item.is_custom,
        }
        for item in grocery_list.items
    ]


# ─────────────────────────────────────────
# GENERATE GROCERY LIST
# GET /api/grocery/<plan_id>
#
# Regenerates the list from meal ingredients.
# Deletes all auto-generated items and
# recreates them. Custom items are preserved.
# Call this only when the meal plan changes
# or the user explicitly requests a refresh.
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
        grocery_list = GroceryList(plan_id=plan_id, total_price=0)
        db.session.add(grocery_list)
        db.session.commit()

    # ── Aggregate ingredients across all plan meals ──
    grocery_map = {}

    for plan_meal in plan_meals:
        meal = Meal.query.get(plan_meal.meal_id)
        if not meal:
            continue

        day_scale = plan_meal.duration_days

        for meal_ingredient in meal.ingredients:
            ingredient = meal_ingredient.ingredient
            total_quantity = meal_ingredient.quantity * day_scale
            total_price = round(total_quantity * ingredient.unit_price_xaf, 2)
            ingredient_id = ingredient.id

            if ingredient_id in grocery_map:
                grocery_map[ingredient_id]["quantity"]    += total_quantity
                grocery_map[ingredient_id]["total_price"] += total_price
            else:
                grocery_map[ingredient_id] = {
                    "ingredient_id": ingredient_id,
                    "name":          ingredient.name,
                    "unit":          ingredient.market_unit,
                    "unit_price":    ingredient.unit_price_xaf,
                    "quantity":      total_quantity,
                    "total_price":   total_price,
                }

    for item in grocery_map.values():
        item["quantity"]    = round(item["quantity"],    3)
        item["total_price"] = round(item["total_price"], 2)

    # Clear old auto-generated items, keep custom ones
    GroceryListItem.query.filter_by(
        list_id=grocery_list.list_id,
        is_custom=False
    ).delete()

    for ingredient_id, data in grocery_map.items():
        item = GroceryListItem(
            list_id=grocery_list.list_id,
            ingredient_id=ingredient_id,
            quantity=data["quantity"],
            unit=data["unit"],
            unit_price=data["unit_price"],
            total_price=data["total_price"],
            is_custom=False,
        )
        db.session.add(item)

    db.session.commit()
    recalculate_total(grocery_list)

    return jsonify({
        "plan_id":       plan_id,
        "list_id":       grocery_list.list_id,
        "budget":        plan.total_budget,
        "total_price":   grocery_list.total_price,
        "within_budget": grocery_list.total_price <= plan.total_budget,
        "items":         serialize_items(grocery_list),
    }), 200


# ─────────────────────────────────────────
# GET SAVED GROCERY LIST (NO REGENERATION)
# GET /api/grocery/<plan_id>/saved
#
# Fetches the existing grocery list exactly
# as stored — manual edits are preserved.
# This is the endpoint used on every normal
# page load. Returns 404 if no list exists
# yet (frontend should then call generate).
# ─────────────────────────────────────────
@grocery_bp.route("/<int:plan_id>/saved", methods=["GET"])
def get_saved_grocery_list(plan_id):

    plan = MealPlan.query.get(plan_id)
    grocery_list = GroceryList.query.filter_by(plan_id=plan_id).first()

    if not grocery_list:
        return jsonify({"error": "No grocery list found"}), 404

    return jsonify({
        "plan_id":       plan_id,
        "list_id":       grocery_list.list_id,
        "created_at":    str(grocery_list.created_at),
        "budget":        plan.total_budget if plan else 0,
        "total_price":   grocery_list.total_price,
        "within_budget": grocery_list.total_price <= (plan.total_budget if plan else 0),
        "items":         serialize_items(grocery_list),
    }), 200


# ─────────────────────────────────────────
# UPDATE ITEM QUANTITY
# PATCH /api/grocery/item/<item_id>
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>", methods=["PATCH"])
def update_item_quantity(item_id):

    item = GroceryListItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json()
    quantity = data.get("quantity")

    if quantity is None or float(quantity) <= 0:
        return jsonify({"error": "Quantity must be greater than 0"}), 400

    item.quantity    = float(quantity)
    item.total_price = round(item.quantity * item.unit_price, 2)
    db.session.commit()

    recalculate_total(item.grocery_list)

    return jsonify({
        "message":     "Quantity updated",
        "item_id":     item.item_id,
        "quantity":    item.quantity,
        "total_price": item.total_price,
    }), 200


# ─────────────────────────────────────────
# REMOVE ITEM
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
# ADD INGREDIENT TO LIST
# POST /api/grocery/<list_id>/add
#
# Handles two cases:
#
# 1. DB ingredient (ingredient_id provided):
#    Fetches name/unit/price from the
#    ingredients table. Stored as is_custom=False.
#
# 2. Custom ingredient (no ingredient_id):
#    User supplies name, unit, unit_price,
#    quantity. Stored as is_custom=True.
#
# Request body examples:
#   { "ingredient_id": 5, "quantity": 2 }
#   { "name": "Smoked fish", "unit": "piece",
#     "unit_price": 500, "quantity": 3,
#     "save_to_profile": true, "user_id": 1 }
# ─────────────────────────────────────────
@grocery_bp.route("/<int:list_id>/add", methods=["POST"])
def add_ingredient(list_id):

    grocery_list = GroceryList.query.get(list_id)
    if not grocery_list:
        return jsonify({"error": "Grocery list not found"}), 404

    data = request.get_json()
    ingredient_id = data.get("ingredient_id")

    # ── Case 1: DB ingredient ──────────────────────────────────────
    if ingredient_id:
        ingredient = Ingredient.query.get(ingredient_id)
        if not ingredient:
            return jsonify({"error": "Ingredient not found in database"}), 404

        quantity    = float(data.get("quantity", 1))
        unit_price  = ingredient.unit_price_xaf
        total_price = round(quantity * unit_price, 2)

        item = GroceryListItem(
            list_id=list_id,
            ingredient_id=ingredient_id,
            quantity=quantity,
            unit=ingredient.market_unit,
            unit_price=unit_price,
            total_price=total_price,
            is_custom=False,
        )

        db.session.add(item)
        db.session.commit()
        recalculate_total(grocery_list)

        return jsonify({
            "message": "Ingredient added",
            "item_id": item.item_id,
        }), 201

    # ── Case 2: Custom ingredient ──────────────────────────────────
    required_fields = ["name", "unit_price", "quantity"]
    if not all(data.get(f) for f in required_fields):
        return jsonify({
            "error": "name, unit_price and quantity are required for custom ingredients"
        }), 400

    quantity    = float(data["quantity"])
    unit_price  = float(data["unit_price"])
    total_price = round(quantity * unit_price, 2)

    item = GroceryListItem(
        list_id=list_id,
        ingredient_id=None,
        custom_name=data["name"],
        quantity=quantity,
        unit=data.get("unit", ""),
        unit_price=unit_price,
        total_price=total_price,
        is_custom=True,
    )

    db.session.add(item)
    db.session.commit()
    recalculate_total(grocery_list)

    # Optionally save to user's personal ingredient list
    saved_to_profile = False
    if data.get("save_to_profile") and data.get("user_id"):
        existing = UserIngredient.query.filter_by(
            user_id=data["user_id"],
            ingredient_name=data["name"]
        ).first()

        if not existing:
            saved = UserIngredient(
                user_id=data["user_id"],
                ingredient_name=data["name"],
                unit=data.get("unit"),
                estimated_price=unit_price,
            )
            db.session.add(saved)
            db.session.commit()
            saved_to_profile = True

    return jsonify({
        "message":          "Custom ingredient added",
        "item_id":          item.item_id,
        "saved_to_profile": saved_to_profile,
    }), 201


# ─────────────────────────────────────────
# GET PERSONAL INGREDIENTS
# GET /api/grocery/personal/<user_id>
# ─────────────────────────────────────────
@grocery_bp.route("/personal/<int:user_id>", methods=["GET"])
def get_personal_ingredients(user_id):

    saved_items = UserIngredient.query.filter_by(user_id=user_id).all()

    return jsonify([
        {
            "id":               item.id,
            "ingredient_name":  item.ingredient_name,
            "unit":             item.unit,
            "estimated_price":  item.estimated_price,
        }
        for item in saved_items
    ]), 200


# ─────────────────────────────────────────
# DELETE PERSONAL INGREDIENT
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