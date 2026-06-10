from dotenv import load_dotenv
load_dotenv()

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

    # ── CORS ──────────────────────────────────────────────────────────
    # Use wildcard origin so any local port works in development and
    # the production frontend works in production.
    # JWT is sent in the Authorization header — supports_credentials is
    # not required (that is for cookie-based auth only).
    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"])

    # Belt-and-suspenders: ensure CORS headers survive any middleware.
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"]  = "*"
        response.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, Accept"
        )
        response.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        return response
    # ──────────────────────────────────────────────────────────────────

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

    # Import ALL models so migrations can detect them
    from models import (
        User,
        UserAllergy,
        UserDiet,
        UserIngredient,
        Meal,
        Ingredient,
        IngredientAllergen,
        MealIngredient,
        MealDietTag,
        UnitConversion,
        MealPlan,
        MealPlanMeal,
        GroceryList,
        GroceryListItem,
    )

    # Register blueprints
    from routes.auth        import auth_bp
    from routes.meals       import meals_bp
    from routes.meal_plan   import meal_plan_bp
    from routes.grocery     import grocery_bp
    from routes.ingredients import ingredients_bp
    from routes.ai          import ai_bp

    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(meals_bp,       url_prefix="/api/meals")
    app.register_blueprint(meal_plan_bp,   url_prefix="/api/meal_plan")
    app.register_blueprint(grocery_bp,     url_prefix="/api/grocery")
    app.register_blueprint(ingredients_bp, url_prefix="/api/ingredients")
    app.register_blueprint(ai_bp,          url_prefix="/api/ai")

    with app.app_context():
        db.create_all()
        # Auto-seed if database is empty
        from models import Meal
        if Meal.query.count() == 0:
            try:
                from seed import seed_database
                seed_database()
                print("Database seeded successfully")
            except Exception as e:
                print(f"Seeding skipped: {e}")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
