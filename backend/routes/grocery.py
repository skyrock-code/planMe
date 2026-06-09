from flask import Blueprint, request, jsonify
from extensions import db
from models import (
    MealPlan,
    MealPlanMeal,
    Meal,
    GroceryList,
    GroceryListItem,
    UserIngredient,
)

grocery_bp = Blueprint("grocery", __name__)

# ─────────────────────────────────────────
# HELPER: RECALCULATE GROCERY LIST TOTAL
# ─────────────────────────────────────────
def recalculate_total(grocery_list):
    # Expire cache so SQLAlchemy re-queries from DB (bulk deletes
    # are otherwise invisible to the ORM).
    db.session.expire(grocery_list)

    # Exclude items marked as always_at_home — user already has them.
    grocery_list.total_price = round(
        sum(
            item.total_price
            for item in grocery_list.items
            if not item.always_at_home
        ),
        2,
    )

    db.session.commit()

    
# ─────────────────────────────────────────
# HELPER: SERIALIZE ITEMS
# ─────────────────────────────────────────
def serialize_items(grocery_list):
    """
    Serializes all items in a grocery list into a list of dicts.
    Handles both standard database ingredients and custom user items.
    Uses correct Ingredient model field names: name, market_unit, unit_price_xaf.
    """
    return [
        {
            "item_id":        item.item_id,
            "name":
                item.ingredient.name
                if item.ingredient
                else item.custom_name,
            "unit":           item.unit,
            "unit_price":     item.unit_price,
            "quantity":       item.quantity,
            "total_price":    item.total_price,
            "is_custom":      item.is_custom,
            "always_at_home": item.always_at_home,
            "category":
                item.ingredient.category
                if item.ingredient
                else "Other",
        }
        for item in grocery_list.items
    ]


# ─────────────────────────────────────────
# GENERATE GROCERY LIST
# GET /api/grocery/<plan_id>
# ─────────────────────────────────────────
@grocery_bp.route("/<int:plan_id>", methods=["GET"])
def generate_grocery_list(plan_id):

    # Check if meal plan exists
    plan = MealPlan.query.get(plan_id)

    if not plan:
        return jsonify({
            "error": "Meal plan not found"
        }), 404

    # Get assigned meals
    plan_meals = MealPlanMeal.query.filter_by(
        plan_id=plan_id
    ).all()

    if not plan_meals:
        return jsonify({
            "error": "No meals assigned to this plan yet"
        }), 404

    # Get or create grocery list
    grocery_list = GroceryList.query.filter_by(
        plan_id=plan_id
    ).first()

    if not grocery_list:

        grocery_list = GroceryList(
            plan_id=plan_id,
            total_price=0
        )

        db.session.add(grocery_list)
        db.session.commit()

    # ─────────────────────────────────────
    # AGGREGATE INGREDIENTS
    # ─────────────────────────────────────
    grocery_map = {}

    for plan_meal in plan_meals:

        meal = Meal.query.get(plan_meal.meal_id)

        if not meal:
            continue

        # Repeat meal for duration
        day_scale = plan_meal.duration_days

        for meal_ingredient in meal.ingredients:

            ingredient = meal_ingredient.ingredient

            # Scale ingredient quantity by how many days this meal covers
            total_quantity = meal_ingredient.quantity * day_scale

            # Calculate total cost using correct price field: unit_price_xaf
            total_price = round(
                total_quantity * ingredient.unit_price_xaf,
                2
            )

            # Use correct primary key: id (not ingredient_id)
            ingredient_id = ingredient.id

            # Aggregate: add to existing entry or create new one
            if ingredient_id in grocery_map:
                grocery_map[ingredient_id]["quantity"]    += total_quantity
                grocery_map[ingredient_id]["total_price"] += total_price
            else:
                grocery_map[ingredient_id] = {
                    "ingredient_id": ingredient_id,
                    "name":          ingredient.name,           # correct field
                    "unit":          ingredient.market_unit,    # correct field
                    "unit_price":    ingredient.unit_price_xaf, # correct field
                    "quantity":      total_quantity,
                    "total_price":   total_price,
                }

    # ─────────────────────────────────────
    # ROUND VALUES
    # ─────────────────────────────────────
    for item in grocery_map.values():

        item["quantity"] = round(
            item["quantity"],
            3
        )

        item["total_price"] = round(
            item["total_price"],
            2
        )

    # ─────────────────────────────────────
    # CLEAR OLD AUTO ITEMS
    # KEEP CUSTOM ITEMS
    # ─────────────────────────────────────
    # synchronize_session=False tells SQLAlchemy not to try
    # updating the in-memory session — we handle that ourselves
    # by expiring grocery_list inside recalculate_total().
    # Committing here ensures the DELETE hits the DB before
    # we insert new rows, preventing any stale-read issue.
    GroceryListItem.query.filter_by(
        list_id=grocery_list.list_id,
        is_custom=False
    ).delete(synchronize_session=False)
    db.session.commit()

    # ─────────────────────────────────────
    # SAVE ITEMS
    # ─────────────────────────────────────
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

    # Recalculate final total
    recalculate_total(grocery_list)

    # ─────────────────────────────────────
    # RESPONSE
    # ─────────────────────────────────────
    return jsonify({

        "plan_id": plan_id,

        "list_id": grocery_list.list_id,

        "budget": plan.total_budget,

        "total_price": grocery_list.total_price,

        "within_budget":
            grocery_list.total_price <= plan.total_budget,

        "items": serialize_items(grocery_list),

    }), 200


# ─────────────────────────────────────────
# GET SAVED GROCERY LIST
# GET /api/grocery/<plan_id>/saved
# ─────────────────────────────────────────
@grocery_bp.route("/<int:plan_id>/saved", methods=["GET"])
def get_saved_grocery_list(plan_id):

    plan = MealPlan.query.get(plan_id)

    grocery_list = GroceryList.query.filter_by(
        plan_id=plan_id
    ).first()

    if not grocery_list:
        return jsonify({
            "error": "No grocery list found"
        }), 404

    return jsonify({

        "plan_id": plan_id,

        "list_id": grocery_list.list_id,

        "created_at": str(grocery_list.created_at),

        "budget": plan.total_budget,

        "total_price": grocery_list.total_price,

        "within_budget":
            grocery_list.total_price <= plan.total_budget,

        "items": serialize_items(grocery_list),

    }), 200


# ─────────────────────────────────────────
# UPDATE ITEM
# PATCH /api/grocery/item/<item_id>
#
# Accepts either "quantity" or "total_price".
# unit_price is always read from the stored
# column — never derived or overwritten here.
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>", methods=["PATCH"])
def update_item(item_id):

    item = GroceryListItem.query.get(item_id)

    if not item:
        return jsonify({"error": "Item not found"}), 404

    data = request.get_json()

    # Always read unit_price from the stored column
    unit_price = item.unit_price

    if "quantity" in data:
        new_qty = float(data["quantity"])
        if new_qty <= 0:
            return jsonify({"error": "Quantity must be greater than 0"}), 400
        item.quantity    = round(new_qty, 3)
        item.total_price = round(new_qty * unit_price, 2)

    elif "total_price" in data:
        new_total = float(data["total_price"])
        if new_total <= 0:
            return jsonify({"error": "Total price must be greater than 0"}), 400
        item.total_price = round(new_total, 2)
        item.quantity    = round(new_total / unit_price, 3) if unit_price > 0 else item.quantity

    db.session.commit()
    recalculate_total(item.grocery_list)

    return jsonify({
        "item_id":     item.item_id,
        "quantity":    item.quantity,
        "total_price": item.total_price,
        "list_total":  item.grocery_list.total_price,
    }), 200


# ─────────────────────────────────────────
# REMOVE ITEM
# DELETE /api/grocery/item/<item_id>
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>", methods=["DELETE"])
def remove_item(item_id):

    item = GroceryListItem.query.get(item_id)

    if not item:
        return jsonify({
            "error": "Item not found"
        }), 404

    grocery_list = item.grocery_list

    db.session.delete(item)
    db.session.commit()

    recalculate_total(grocery_list)

    return jsonify({
        "message": "Item removed"
    }), 200


# ─────────────────────────────────────────
# TOGGLE "ALWAYS AT HOME"
# PATCH /api/grocery/item/<item_id>/toggle-home
#
# Flips always_at_home on a single item.
# Recalculates the list total after the flip
# so excluded items are not counted.
# ─────────────────────────────────────────
@grocery_bp.route("/item/<int:item_id>/toggle-home", methods=["PATCH"])
def toggle_always_at_home(item_id):

    item = GroceryListItem.query.get(item_id)

    if not item:
        return jsonify({"error": "Item not found"}), 404

    item.always_at_home = not item.always_at_home
    db.session.commit()

    recalculate_total(item.grocery_list)

    return jsonify({
        "item_id":        item.item_id,
        "always_at_home": item.always_at_home,
        "new_total":      item.grocery_list.total_price,
    }), 200


# ─────────────────────────────────────────
# ADD CUSTOM INGREDIENT
# POST /api/grocery/<list_id>/add
# ─────────────────────────────────────────
@grocery_bp.route("/<int:list_id>/add", methods=["POST"])
def add_custom_ingredient(list_id):

    grocery_list = GroceryList.query.get(list_id)

    if not grocery_list:
        return jsonify({
            "error": "Grocery list not found"
        }), 404

    data = request.get_json()

    required_fields = [
        "name",
        "unit_price",
        "quantity"
    ]

    if not all(data.get(f) for f in required_fields):

        return jsonify({
            "error":
                "name, unit_price and quantity are required"
        }), 400

    # Convert to float explicitly — JSON values may arrive as strings
    quantity    = float(data["quantity"])
    unit_price  = float(data["unit_price"])
    total_price = round(quantity * unit_price, 2)

    # Add custom item
    item = GroceryListItem(

        list_id=list_id,

        ingredient_id=None,

        custom_name=data["name"],

        quantity=quantity,

        unit=data.get("unit"),

        unit_price=unit_price,

        total_price=total_price,

        is_custom=True,
    )

    db.session.add(item)
    db.session.commit()

    recalculate_total(grocery_list)

    # Save to user's personal ingredients
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

        "message": "Custom ingredient added",

        "item_id": item.item_id,

        "saved_to_profile": saved_to_profile,

    }), 201


# ─────────────────────────────────────────
# GET PERSONAL INGREDIENTS
# GET /api/grocery/personal/<user_id>
# ─────────────────────────────────────────
@grocery_bp.route("/personal/<int:user_id>", methods=["GET"])
def get_personal_ingredients(user_id):

    saved_items = UserIngredient.query.filter_by(
        user_id=user_id
    ).all()

    return jsonify([

        {
            "id": item.id,

            "ingredient_name": item.ingredient_name,

            "unit": item.unit,

            "estimated_price": item.estimated_price,
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
        return jsonify({
            "error": "Saved ingredient not found"
        }), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({
        "message": "Saved ingredient removed"
    }), 200