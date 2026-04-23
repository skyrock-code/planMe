from flask import flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import COR
from config import config

db = SQLAlchemy{}

def create_app():
    app = flask(__name__)
    app.config.from_object(config)

    CORS(app)
    db.init_app(app)

    #import models so tables are registered
    from models import User, Meal, Ingredient