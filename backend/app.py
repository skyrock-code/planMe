try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

import os
from flask import Flask, jsonify
from datetime import datetime
from flask_cors import CORS
from config import Config
from extensions import db
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate

migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Database configuration
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url.replace('postgres://', 'postgresql://')
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planme.db'
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False

    # CORS configuration
    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"])

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    # Health routes
    @app.route("/ping", methods=["GET"])
    def ping():
        return jsonify({"status": "alive", "timestamp": datetime.utcnow().isoformat()}), 200

    @app.route("/", methods=["GET"])
    def home():
        return jsonify({"message": "PlanMe API running", "status": "healthy"}), 200

    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)

    # Import models
    from models import (
        User, UserAllergy, UserDiet, UserIngredient,
        Meal, Ingredient, IngredientAllergen, MealIngredient,
        MealDietTag, UnitConversion, MealPlan, MealPlanMeal,
        GroceryList, GroceryListItem,
    )

    # Register blueprints
    from routes.auth import auth_bp
    from routes.meals import meals_bp
    from routes.meal_plan import meal_plan_bp
    from routes.grocery import grocery_bp
    from routes.ingredients import ingredients_bp
    from routes.ai import ai_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(meals_bp, url_prefix="/api/meals")
    app.register_blueprint(meal_plan_bp, url_prefix="/api/meal_plan")
    app.register_blueprint(grocery_bp, url_prefix="/api/grocery")
    app.register_blueprint(ingredients_bp, url_prefix="/api/ingredients")
    app.register_blueprint(ai_bp, url_prefix="/api/ai")

    # Auto-seed database if empty
    with app.app_context():
        db.create_all()
        from models import Meal
        if Meal.query.count() == 0:
            try:
                from seed import seed_database
                seed_database()
                print("Database seeded successfully")
            except Exception as e:
                print(f"Seeding error: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)