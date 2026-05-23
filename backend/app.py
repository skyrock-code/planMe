from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

# create migrate instance globally (cleaner practice)
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS
    CORS(app)

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)   # attach migrate here
    jwt = JWTManager(app)

    # Import ALL models so migrations can detect them
    from models import (
        User,
        UserAllergy,
        UserDiet,
        Meal,
        Ingredient,
        IngredientAllergen,
        MealIngredient,
        MealDietTag,
        MealPlan,
        MealPlanMeal,
        GroceryList,
        GroceryListItem,
    )

    # Register blueprints
    from routes.auth import auth_bp
    from routes.meals import meals_bp
    from routes.meal_plan import meal_plan_bp
    from routes.grocery import grocery_bp


    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(meals_bp, url_prefix="/api/meals")
    app.register_blueprint(meal_plan_bp, url_prefix="/api/meal_plan")
    app.register_blueprint(grocery_bp, url_prefix="/api/grocery")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)