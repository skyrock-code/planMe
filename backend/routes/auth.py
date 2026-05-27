from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required
from extensions import db
from models import User, UserAllergy, UserDiet

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


# ─────────────────────────────────────────────────────
# GET USER ALLERGIES
# GET /api/auth/user/allergies
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/allergies', methods=['GET'])
@jwt_required()
def get_allergies():
    """
    Returns all allergy records for the authenticated user.
    Used by Profile.jsx to display current allergies.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify([
        {"id": a.id, "allergen": a.allergen}
        for a in user.allergies
    ]), 200


# ─────────────────────────────────────────────────────
# ADD ALLERGY
# POST /api/auth/user/allergies
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/allergies', methods=['POST'])
@jwt_required()
def add_allergy():
    """
    Adds a new allergen to the user's allergy list.
    Prevents duplicates — will not add the same allergen twice.
    allergen value is lowercased before saving for consistency.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())
    data    = request.get_json()

    allergen = data.get('allergen', '').strip().lower()

    if not allergen:
        return jsonify({"error": "allergen is required"}), 400

    # Check for duplicate — case-insensitive
    existing = UserAllergy.query.filter_by(
        user_id  = user_id,
        allergen = allergen
    ).first()

    if existing:
        return jsonify({
            "error": f"'{allergen}' is already in your allergy list"
        }), 409

    new_allergy = UserAllergy(
        user_id  = user_id,
        allergen = allergen
    )
    db.session.add(new_allergy)
    db.session.commit()

    return jsonify({
        "message":  "Allergy added",
        "id":       new_allergy.id,
        "allergen": new_allergy.allergen
    }), 201


# ─────────────────────────────────────────────────────
# DELETE ALLERGY
# DELETE /api/auth/user/allergies/<allergy_id>
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/allergies/<int:allergy_id>', methods=['DELETE'])
@jwt_required()
def delete_allergy(allergy_id):
    """
    Removes an allergy from the user's list by its database ID.
    Verifies ownership — users can only delete their own allergies.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())

    allergy = UserAllergy.query.get(allergy_id)

    if not allergy:
        return jsonify({"error": "Allergy not found"}), 404

    # Security: verify this allergy belongs to the requesting user
    if allergy.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(allergy)
    db.session.commit()

    return jsonify({"message": "Allergy removed"}), 200


# ─────────────────────────────────────────────────────
# GET DIET PREFERENCES
# GET /api/auth/user/diets
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/diets', methods=['GET'])
@jwt_required()
def get_diets():
    """
    Returns all dietary preferences for the authenticated user.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify([
        {"id": d.id, "diet_type": d.diet_type}
        for d in user.diets
    ]), 200


# ─────────────────────────────────────────────────────
# ADD DIET PREFERENCE
# POST /api/auth/user/diets
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/diets', methods=['POST'])
@jwt_required()
def add_diet():
    """
    Adds a dietary preference to the user's profile.
    Prevents duplicates. Lowercases input for consistency.

    Recommended diet_type values:
    spicy, traditional, halal, vegetarian, grilled,
    vegan, pescatarian, gluten-free, dairy-free
    """
    from flask_jwt_extended import get_jwt_identity
    user_id   = int(get_jwt_identity())
    data      = request.get_json()

    diet_type = data.get('diet_type', '').strip().lower()

    if not diet_type:
        return jsonify({"error": "diet_type is required"}), 400

    # Prevent duplicates
    existing = UserDiet.query.filter_by(
        user_id   = user_id,
        diet_type = diet_type
    ).first()

    if existing:
        return jsonify({
            "error": f"'{diet_type}' is already in your preferences"
        }), 409

    new_diet = UserDiet(
        user_id   = user_id,
        diet_type = diet_type
    )
    db.session.add(new_diet)
    db.session.commit()

    return jsonify({
        "message":   "Diet preference added",
        "id":        new_diet.id,
        "diet_type": new_diet.diet_type
    }), 201


# ─────────────────────────────────────────────────────
# DELETE DIET PREFERENCE
# DELETE /api/auth/user/diets/<diet_id>
# ─────────────────────────────────────────────────────
@auth_bp.route('/user/diets/<int:diet_id>', methods=['DELETE'])
@jwt_required()
def delete_diet(diet_id):
    """
    Removes a dietary preference by its database ID.
    Verifies ownership before deletion.
    """
    from flask_jwt_extended import get_jwt_identity
    user_id = int(get_jwt_identity())

    diet = UserDiet.query.get(diet_id)

    if not diet:
        return jsonify({"error": "Diet preference not found"}), 404

    if diet.user_id != user_id:
        return jsonify({"error": "Not authorized"}), 403

    db.session.delete(diet)
    db.session.commit()

    return jsonify({"message": "Diet preference removed"}), 200