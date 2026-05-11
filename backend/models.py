from extensions import db
from datetime import datetime


# ─────────────────────────────────────────
# 1. USER
# ─────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'user'

    user_id    = db.Column(db.Integer, primary_key=True)
    username   = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(200), nullable=False)
    age        = db.Column(db.Integer)
    gender     = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    allergies  = db.relationship('UserAllergy', backref='user', lazy=True, cascade='all, delete-orphan')
    diets      = db.relationship('UserDiet',    backref='user', lazy=True, cascade='all, delete-orphan')
    meals      = db.relationship('Meal',        backref='user', lazy=True)
    meal_plans = db.relationship('MealPlan',    backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"<User {self.username}>"


# ─────────────────────────────────────────
# 2. USER ALLERGY
# ─────────────────────────────────────────
class UserAllergy(db.Model):
    __tablename__ = 'user_allergy'

    id       = db.Column(db.Integer, primary_key=True)
    user_id  = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    allergen = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<UserAllergy {self.allergen}>"


# ─────────────────────────────────────────
# 3. USER DIET
# ─────────────────────────────────────────
class UserDiet(db.Model):
    __tablename__ = 'user_diet'

    id        = db.Column(db.Integer, primary_key=True)
    user_id   = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    diet_type = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<UserDiet {self.diet_type}>"
    

# ─────────────────────────────────────────
# 4. USER INGREDIENT (personal custom ingredients)
# ─────────────────────────────────────────
class UserIngredient(db.Model):
    __tablename__ = 'user_ingredient'
 
    id              = db.Column(db.Integer, primary_key=True)
    user_id         = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    ingredient_name = db.Column(db.String(150), nullable=False)
    unit            = db.Column(db.String(20))
    estimated_price = db.Column(db.Float)
 
    def __repr__(self):
        return f"<UserIngredient {self.ingredient_name}>"
 


# ─────────────────────────────────────────
# 4. MEAL
# ─────────────────────────────────────────
class Meal(db.Model):
    __tablename__ = 'meal'

    meal_id      = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    meal_name    = db.Column(db.String(150), nullable=False)
    servings     = db.Column(db.Integer, nullable=False)

    # Relationships
    ingredients = db.relationship('MealIngredient', backref='meal', lazy=True, cascade='all, delete-orphan')
    diet_tags   = db.relationship('MealDietTag',    backref='meal', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Meal {self.meal_name}>"


# ─────────────────────────────────────────
# 5. INGREDIENT
# ─────────────────────────────────────────
class Ingredient(db.Model):
    __tablename__ = 'ingredient'

    ingredient_id   = db.Column(db.Integer, primary_key=True)
    ingredient_name = db.Column(db.String(150), nullable=False)
    unit            = db.Column(db.String(20))
    estimated_price = db.Column(db.Float, nullable=False)

    # Relationships
    allergens = db.relationship('IngredientAllergen', backref='ingredient', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"<Ingredient {self.ingredient_name}>"


# ─────────────────────────────────────────
# 6. INGREDIENT ALLERGEN
# ─────────────────────────────────────────
class IngredientAllergen(db.Model):
    __tablename__ = 'ingredient_allergen'

    id            = db.Column(db.Integer, primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.ingredient_id'), nullable=False)
    allergen      = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<IngredientAllergen {self.allergen}>"


# ─────────────────────────────────────────
# 7. MEAL INGREDIENT (junction)
# ─────────────────────────────────────────
class MealIngredient(db.Model):
    __tablename__ = 'meal_ingredient'

    meal_id       = db.Column(db.Integer, db.ForeignKey('meal.meal_id'),             primary_key=True)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.ingredient_id'), primary_key=True)
    quantity      = db.Column(db.Float, nullable=False)

    ingredient = db.relationship('Ingredient', lazy=True)

    def __repr__(self):
        return f"<MealIngredient meal={self.meal_id} ingredient={self.ingredient_id}>"


# ─────────────────────────────────────────
# 8. MEAL DIET TAG
# ─────────────────────────────────────────
class MealDietTag(db.Model):
    __tablename__ = 'meal_diet_tag'

    id        = db.Column(db.Integer, primary_key=True)
    meal_id   = db.Column(db.Integer, db.ForeignKey('meal.meal_id'), nullable=False)
    diet_type = db.Column(db.String(100), nullable=False)

    def __repr__(self):
        return f"<MealDietTag {self.diet_type}>"


# ─────────────────────────────────────────
# 9. MEAL PLAN
# ─────────────────────────────────────────
class MealPlan(db.Model):
    __tablename__ = 'meal_plan'

    plan_id      = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=False)
    start_date   = db.Column(db.Date, nullable=False)
    end_date     = db.Column(db.Date, nullable=False)
    total_budget = db.Column(db.Float, nullable=False)   # PRIMARY hard constraint
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    plan_meals   = db.relationship('MealPlanMeal', backref='meal_plan', lazy=True, cascade='all, delete-orphan')
    grocery_list = db.relationship('GroceryList',  backref='meal_plan', lazy=True, uselist=False, cascade='all, delete-orphan')

    def __repr__(self):
        return f"<MealPlan {self.plan_id}>"


# ─────────────────────────────────────────
# 10. MEAL PLAN MEAL (CORE LOGIC TABLE)
# ─────────────────────────────────────────
class MealPlanMeal(db.Model):
    __tablename__ = 'meal_plan_meal'

    plan_id       = db.Column(db.Integer, db.ForeignKey('meal_plan.plan_id'), primary_key=True)
    meal_id       = db.Column(db.Integer, db.ForeignKey('meal.meal_id'),      primary_key=True)
    start_date    = db.Column(db.Date, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False, default=1)

    meal = db.relationship('Meal', lazy=True)

    def __repr__(self):
        return f"<MealPlanMeal plan={self.plan_id} meal={self.meal_id} from={self.start_date} for={self.duration_days}d>"


# ─────────────────────────────────────────
# 11. GROCERY LIST
# ─────────────────────────────────────────
class GroceryList(db.Model):
    __tablename__ = 'grocery_list'

    list_id     = db.Column(db.Integer, primary_key=True)
    plan_id     = db.Column(db.Integer, db.ForeignKey('meal_plan.plan_id'), nullable=False)
    total_price = db.Column(db.Float, default=0.0)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship('GroceryListItem', backref='grocery_list', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f"<GroceryList {self.list_id}>"


# ─────────────────────────────────────────
# 12. GROCERY LIST ITEM
# ─────────────────────────────────────────
class GroceryListItem(db.Model):
    __tablename__ = 'grocery_list_item'

    item_id       = db.Column(db.Integer, primary_key=True)
    list_id       = db.Column(db.Integer, db.ForeignKey('grocery_list.list_id'),     nullable=False)
    ingredient_id = db.Column(db.Integer, db.ForeignKey('ingredient.ingredient_id'), nullable=False)
    quantity      = db.Column(db.Float, nullable=False)
    unit          = db.Column(db.String(20))
    unit_price    = db.Column(db.Float, nullable=False)
    total_price   = db.Column(db.Float, nullable=False)

    ingredient = db.relationship('Ingredient', lazy=True)

    def __repr__(self):
        return f"<GroceryListItem {self.item_id}>"