from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
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
        username = data['username'],
        email    = data['email'],
        password = hashed_password,
        age      = data.get('age'),     # optional
        gender   = data.get('gender'),  # optional
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
        "message":      "Login successful",
        "access_token": access_token,
        "user_id":      user.user_id,
        "username":     user.username,
    }), 200