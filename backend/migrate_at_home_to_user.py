"""
One-time migration: copy plan-specific always_at_home flags from
GroceryListItem into the global UserIngredient table.

Run from backend/:
    python migrate_at_home_to_user.py
"""
from app import create_app
from extensions import db
from models import GroceryListItem, UserIngredient, MealPlan, GroceryList, Ingredient


def migrate():
    app = create_app()
    with app.app_context():
        rows = (
            db.session.query(
                GroceryListItem.ingredient_id,
                MealPlan.user_id,
            )
            .join(GroceryList, GroceryListItem.list_id == GroceryList.list_id)
            .join(MealPlan, GroceryList.plan_id == MealPlan.plan_id)
            .filter(
                GroceryListItem.always_at_home.is_(True),
                GroceryListItem.is_custom.is_(False),
                GroceryListItem.ingredient_id.isnot(None),
            )
            .distinct()
            .all()
        )

        count = 0
        for ingredient_id, user_id in rows:
            ingredient = Ingredient.query.get(ingredient_id)
            if not ingredient:
                continue

            name_lower = ingredient.name.lower()
            existing = UserIngredient.query.filter(
                UserIngredient.user_id == user_id,
                db.func.lower(UserIngredient.ingredient_name) == name_lower,
            ).first()

            if existing:
                if not existing.always_at_home:
                    existing.always_at_home = True
                    count += 1
                    print(f"Updated {ingredient.name} for user {user_id}")
            else:
                db.session.add(UserIngredient(
                    user_id=user_id,
                    ingredient_name=ingredient.name,
                    unit=ingredient.market_unit,
                    estimated_price=ingredient.unit_price_xaf,
                    always_at_home=True,
                    plan_counter=0,
                ))
                count += 1
                print(f"Added {ingredient.name} for user {user_id}")

        db.session.commit()
        print(f"\nMigrated {count} always-at-home items to UserIngredient table")


if __name__ == "__main__":
    migrate()
