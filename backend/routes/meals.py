from flask import Blueprint, request, jsonify
from extensions import db          # ← correct import (not from models)
from models import Meal

meals_bp = Blueprint('meals', __name__)


# ─────────────────────────────────────────
# CREATE MEAL
# POST /api/meals/
# ─────────────────────────────────────────
@meals_bp.route('/', methods=['POST'])
def create_meal():
    data = request.get_json()

    # Validate required fields
    if not data.get('user_id') or not data.get('meal_name') or not data.get('servings'):
        return jsonify({"error": "user_id, meal_name and servings are required"}), 400

    new_meal = Meal(
        user_id      = data['user_id'],
        meal_name    = data['meal_name'],
        servings     = data['servings'],       # optional
    )

    db.session.add(new_meal)
    db.session.commit()

    return jsonify({
        "message": "Meal created",
        "meal_id": new_meal.meal_id
    }), 201


# ─────────────────────────────────────────
# GET ALL MEALS
# GET /api/meals/
# ─────────────────────────────────────────
@meals_bp.route('/', methods=['GET'])
def get_meals():
    meals = Meal.query.all()

    result = [
        {
            "meal_id":      meal.meal_id,
            "meal_name":    meal.meal_name,
            "servings":     meal.servings,
        }
        for meal in meals
    ]

    return jsonify(result), 200


# ─────────────────────────────────────────
# GET SINGLE MEAL
# GET /api/meals/<meal_id>
# ─────────────────────────────────────────
@meals_bp.route('/<int:meal_id>', methods=['GET'])
def get_meal(meal_id):
    meal = Meal.query.get(meal_id)
    if not meal:
        return jsonify({"error": "Meal not found"}), 404

    return jsonify({
        "meal_id":      meal.meal_id,
        "meal_name":    meal.meal_name,
        "servings":     meal.servings,
    }), 200


# ─────────────────────────────────────────
# UPDATE MEAL
# PUT /api/meals/<meal_id>
# ─────────────────────────────────────────
@meals_bp.route('/<int:meal_id>', methods=['PUT'])
def update_meal(meal_id):
    meal = Meal.query.get(meal_id)
    if not meal:
        return jsonify({"error": "Meal not found"}), 404

    data = request.get_json()

    # Only update fields that are provided
    if 'meal_name'    in data: meal.meal_name    = data['meal_name']
    if 'cuisine_type' in data: meal.cuisine_type = data['cuisine_type']
    if 'servings'     in data: meal.servings     = data['servings']

    db.session.commit()

    return jsonify({"message": "Meal updated"}), 200


# ─────────────────────────────────────────
# DELETE MEAL
# DELETE /api/meals/<meal_id>
# ─────────────────────────────────────────
@meals_bp.route('/<int:meal_id>', methods=['DELETE'])
def delete_meal(meal_id):
    meal = Meal.query.get(meal_id)
    if not meal:
        return jsonify({"error": "Meal not found"}), 404

    db.session.delete(meal)
    db.session.commit()

    return jsonify({"message": "Meal deleted"}), 200


# ─────────────────────────────────────────
# GET ALL MEALS FROM DATABASE
# GET /api/meals/all
# Returns all meals available for selection
# Used by frontend for meal swap/replace feature
# ─────────────────────────────────────────
@meals_bp.route('/all', methods=['GET'])
def get_all_meals():
    """
    Returns all meals in the database.
    Used by the WeekPlan screen to populate
    the meal swap/replace selector.
    """
    meals = Meal.query.all()

    result = [
        {
            "meal_id":      meal.meal_id,
            "meal_name":    meal.meal_name,
            "cuisine_type": meal.cuisine_type,
            "servings":     meal.servings,
            "diet_tags":    [tag.diet_type for tag in meal.diet_tags],
        }
        for meal in meals
    ]

    return jsonify(result), 200