from app import db

#USER

class User(db.Model):
    __tablename__= 'user'

    user_id = db.column(db.Integer, primary_key=True)
    username = db.column(db.String(100), nullable=False)
    email =  db.column(db.String(120), unique= True, nullable=False)
    password =  db.column(db.String(200), nullable=False)

       def __rep__(self):
        return f"<User {self.username}>"


#MEAL
class Meal(db.Model):
    __tablename__= 'meal'
    meal_id = db.column(db.Integer, primary_key=True)
    user_id = db.column(db.Integer,db.ForeignKey('user.user_id'))
    