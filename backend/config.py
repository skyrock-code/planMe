import os

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = 'sqlite:///planMe.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT — change this to a long random string in production
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'planme-super-secret-key-change-in-prod')

    # Hugging Face Inference API token
    HF_TOKEN = os.environ.get('HF_TOKEN', '')