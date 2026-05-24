from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required
from extensions import db
from models import User

auth_bp = Blueprint('auth', __name__)


# ─────────────────────────────────────────
# REGISTER
# POST /api/auth/register
# ─────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    # Validate required fields
    required = ['username', 'email', 'password']
    if not all(data.get(f) for f in required):
        return jsonify({"error": "username, email and password are required"}), 400

    # Check if email already exists
    existing_user = User.query.filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({"error": "Email already registered"}), 409

    # Hash the password — never store plain text
    hashed_password = generate_password_hash(data['password'])

    new_user = User(
        username          = data['username'],
        email             = data['email'],
        password          = hashed_password,
        age               = data.get('age'),                    # optional
        gender            = data.get('gender'),                 # optional
        household_size    = data.get('household_size', 2),
        preferred_budget  = data.get('preferred_budget', 50000.0),
        location          = data.get('location', 'Yaoundé'),
        cooking_frequency = data.get('cooking_frequency', 'every_2_days'),
    )

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "User registered successfully",
        "user_id": new_user.user_id
    }), 201


# ─────────────────────────────────────────
# LOGIN
# POST /api/auth/login
# ─────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    # Validate required fields
    if not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    # Find user by email
    user = User.query.filter_by(email=data['email']).first()

    # Check user exists and password is correct
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({"error": "Invalid email or password"}), 401

    # Generate JWT token — identity is the user_id
    access_token = create_access_token(identity=str(user.user_id))

    return jsonify({
        "message":          "Login successful",
        "access_token":     access_token,
        "user_id":          user.user_id,
        "username":         user.username,
        "household_size":   user.household_size,
        "preferred_budget": user.preferred_budget,
        "location":         user.location,
        "cooking_frequency": user.cooking_frequency,
    }), 200


# ─────────────────────────────────────────
# GET USER PROFILE
# GET /api/auth/profile
# ─────────────────────────────────────────
@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Returns the full profile of the currently authenticated user.
    Used by the Profile page to display and edit settings.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "user_id":          user.user_id,
        "username":         user.username,
        "email":            user.email,
        "age":              user.age,
        "gender":           user.gender,
        "household_size":   user.household_size,
        "preferred_budget": user.preferred_budget,
        "location":         user.location,
        "cooking_frequency": user.cooking_frequency,
        "diets":     [d.diet_type for d in user.diets],
        "allergies": [a.allergen  for a in user.allergies],
    }), 200


# ─────────────────────────────────────────
# UPDATE USER PROFILE
# PUT /api/auth/profile
# ─────────────────────────────────────────
@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """
    Updates editable profile fields for the logged-in user.
    Only updates fields that are present in the request body.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    if 'username'         in data: user.username         = data['username']
    if 'location'         in data: user.location         = data['location']
    if 'household_size'   in data: user.household_size   = int(data['household_size'])
    if 'preferred_budget' in data: user.preferred_budget = float(data['preferred_budget'])
    if 'cooking_frequency' in data:
        allowed = ['once_daily', 'twice_daily', 'every_2_days', 'every_3_days', 'flexible']
        if data['cooking_frequency'] not in allowed:
            return jsonify({
                "error": f"Invalid cooking_frequency. Allowed: {allowed}"
            }), 400
        user.cooking_frequency = data['cooking_frequency']

    db.session.commit()

    return jsonify({"message": "Profile updated successfully"}), 200