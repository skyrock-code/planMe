"""
seed_categories.py — assign ingredient categories in the database.

Run once after seeding ingredients:
    python seed_categories.py

Categories and their keyword rules are ordered from most-specific
to least-specific so that e.g. "palm oil" matches Oils before
"palm nut" (also Oils) or a generic "oil" keyword.
"""

from app import create_app
from extensions import db
from models import Ingredient

# (category, [keywords]) — first match wins, case-insensitive substring
CATEGORY_RULES = [
    ("Proteins",    [
        "beef", "chicken", "fresh fish", "smoked fish", "canda",
        "sardine", "egg", "shrimp", "prawn", "meat", "pork",
        "fish", "liver",
    ]),
    ("Vegetables",  [
        "tomato", "contri onion", "onion", "green pepper",
        "green spice", "njama", "waterleaf", "eru", "ndole",
        "coco leave", "green bean", "leek", "carrot",
        "irish potato", "cabbage", "okra",
    ]),
    ("Starches",    [
        "rice", "cocoyam", "yam", "plantain", "maize",
        "garri", "spaghetti", "corn flour", "koki", "bean",
        "banana", "cassava",
    ]),
    ("Spices",      [
        "achu spice", "black pepper", "njansang", "kanwang",
        "crayfish", "seasoning", "ginger", "garlic", "maggi",
        "salt", "pepper", "spice",
    ]),
    ("Oils",        [
        "palm oil", "vegetable oil", "mbanga", "palm nut", "oil",
    ]),
    # anything unmatched falls through to Other
]


def assign_categories():
    app = create_app()
    with app.app_context():
        ingredients = Ingredient.query.all()
        counts: dict[str, int] = {}

        for ing in ingredients:
            name = ing.name.lower()
            assigned = False

            for category, keywords in CATEGORY_RULES:
                if any(kw in name for kw in keywords):
                    ing.category = category
                    counts[category] = counts.get(category, 0) + 1
                    assigned = True
                    break

            if not assigned:
                ing.category = "Other"
                counts["Other"] = counts.get("Other", 0) + 1

        db.session.commit()

        total = len(ingredients)
        print(f"Updated {total} ingredients:")
        for cat in ["Proteins", "Vegetables", "Starches", "Spices", "Oils", "Other"]:
            n = counts.get(cat, 0)
            if n:
                print(f"  {cat:<12} {n}")


if __name__ == "__main__":
    assign_categories()
