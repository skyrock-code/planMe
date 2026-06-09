import os

class Config:
    # Database — uses /data/planMe.db on Render (persistent disk)
    # Falls back to local sqlite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'sqlite:///planMe.db'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT — MUST be set as environment variable in production
    JWT_SECRET_KEY = os.environ.get(
        'JWT_SECRET_KEY',
        'planme-dev-secret-change-in-prod'
    )

    # Hugging Face token
    HF_TOKEN = os.environ.get('HF_TOKEN', '')

    # Frontend URL for CORS — set this in Render environment variables
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
