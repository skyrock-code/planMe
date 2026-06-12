from models import UserIngredient


def check_at_home_review(user_id):
    """
    Returns ingredient names whose plan_counter has reached 7.
    Counters increment when grocery lists are generated (grocery.py).
    """
    user_ingredients = UserIngredient.query.filter_by(
        user_id=user_id,
        always_at_home=True,
    ).all()

    return [
        ui.ingredient_name
        for ui in user_ingredients
        if (ui.plan_counter or 0) >= 7
    ]
