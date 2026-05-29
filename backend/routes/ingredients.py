from flask import Blueprint, request, jsonify
from models import Ingredient

ingredients_bp = Blueprint("ingredients", __name__)


# ─────────────────────────────────────────
# SEARCH INGREDIENTS
# GET /api/ingredients/search?q=<query>
#
# Used by the grocery list "Add Ingredient"
# modal to check if an ingredient exists in
# the database before adding a custom one.
# Returns max 10 matches.
# ─────────────────────────────────────────
@ingredients_bp.route("/search", methods=["GET"])
def search_ingredients():
    q = request.args.get("q", "").strip()

    # Require at least 2 characters to search
    if len(q) < 2:
        return jsonify([]), 200

    results = (
        Ingredient.query
        .filter(Ingredient.name.ilike(f"%{q}%"))
        .order_by(Ingredient.name)
        .limit(10)
        .all()
    )

    return jsonify([
        {
            "id":            ing.id,
            "name":          ing.name,
            "market_unit":   ing.market_unit,
            "unit_price_xaf": ing.unit_price_xaf,
        }
        for ing in results
    ]), 200