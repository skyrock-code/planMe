from flask import Blueprint, jsonify
from datetime import datetime

health_bp = Blueprint('health', __name__)

@health_bp.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "PlanMe API is running!",
        "status": "healthy",
        "version": "1.0.0",
        "endpoints": [
            {"name": "Authentication", "url": "/api/auth/register"},
            {"name": "Authentication", "url": "/api/auth/login"},
            {"name": "Meal Plans", "url": "/api/meal_plan/generate"},
            {"name": "Grocery", "url": "/api/grocery/<plan_id>"},
            {"name": "AI Planning", "url": "/api/ai/generate-plan"},
            {"name": "Health Check", "url": "/ping"}
        ]
    }), 200

@health_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }), 200

@health_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "database": "connected",
        "timestamp": datetime.utcnow().isoformat()
    }), 200