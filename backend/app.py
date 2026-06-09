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

    # ========== DATABASE CONFIGURATION ==========
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url.replace('postgres://', 'postgresql://')
        print(f"Using PostgreSQL database")
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planme.db'
        print(f"Using SQLite database")
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ========== ROOT HEALTH ROUTES ==========
    @app.route('/', methods=['GET'])
    def home():
        return jsonify({
            "message": "PlanMe API is running!",
            "status": "healthy",
            "version": "1.0.0",
            "database": "PostgreSQL" if database_url else "SQLite"
        }), 200

    @app.route('/ping', methods=['GET'])
    def ping():
        return jsonify({
            "status": "alive",
            "timestamp": datetime.utcnow().isoformat()
        }), 200

    # ========== CORS CONFIGURATION ==========
    CORS(app,
         origins=[
             'http://localhost:5173',
             'http://localhost:5174',
             'https://planme-frontend.onrender.com',
         ],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=True)

    # Handle OPTIONS preflight requests
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', 'https://planme-frontend.onrender.com')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response

    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)

    # Import ALL models
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
    from routes.health      import health_bp

    app.register_blueprint(health_bp,         url_prefix="/")
    app.register_blueprint(auth_bp,        url_prefix="/api/auth")
    app.register_blueprint(meals_bp,       url_prefix="/api/meals")
    app.register_blueprint(meal_plan_bp,   url_prefix="/api/meal_plan")
    app.register_blueprint(grocery_bp,     url_prefix="/api/grocery")
    app.register_blueprint(ingredients_bp, url_prefix="/api/ingredients")
    app.register_blueprint(ai_bp,          url_prefix="/api/ai")

    with app.app_context():
        db.create_all()
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
    app.run(debug=True)