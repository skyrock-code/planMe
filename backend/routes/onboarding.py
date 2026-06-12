from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import User

onboarding_bp = Blueprint('onboarding', __name__)

@onboarding_bp.route('/onboarding/complete', methods=['POST'])
@jwt_required()
def complete_onboarding():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    user.has_completed_onboarding = True
    db.session.commit()

    return jsonify({
        "message": "Onboarding completed",
        "has_completed_onboarding": True
    }), 200
