from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash



# ─────────────────────────────────────────
# 1 USER
# ─────────────────────────────────────────
class User(db.Model):
    __tablename__ = "user"

    user_id = db.Column(db.Integer, primary_key=True)

    username = db.Column(db.String(100), nullable=False)

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(200),
        nullable=False
    )

    age = db.Column(db.Integer)

    gender = db.Column(db.String(20))

    # ── Profile / Personalization Fields ──────────────────
    # These fields extend User beyond authentication to store
    # planning preferences used by the meal planner.

    household_size = db.Column(
        db.Integer,
        nullable=True,
        default=2
    )

    preferred_budget = db.Column(
        db.Float,
        nullable=True,
        default=50000.0
    )

    location = db.Column(
        db.String(100),
        nullable=True,
        default="Yaoundé"
    )

    cooking_frequency = db.Column(
        db.String(50),
        nullable=True,
        default="every_2_days"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # Relationships
    allergies = db.relationship(
        "UserAllergy",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    diets = db.relationship(
        "UserDiet",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    meals = db.relationship(
        "Meal",
        backref="user",
        lazy=True
    )

    meal_plans = db.relationship(
        "MealPlan",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    saved_ingredients = db.relationship(
        "UserIngredient",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User {self.username}>"

    def set_password(self, password):
        self.password = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password, password)
    

# ─────────────────────────────────────────
# 2.USER ALLERGY
# ─────────────────────────────────────────
class UserAllergy(db.Model):
    __tablename__ = "user_allergy"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.user_id"),
        nullable=False
    )

    allergen = db.Column(
        db.String(100),
        nullable=False
    )

    def __repr__(self):
        return f"<UserAllergy {self.allergen}>"


# ─────────────────────────────────────────
# USER DIET
# ─────────────────────────────────────────
class UserDiet(db.Model):
    __tablename__ = "user_diet"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.user_id"),
        nullable=False
    )

    diet_type = db.Column(
        db.String(100),
        nullable=False
    )

    def __repr__(self):
        return f"<UserDiet {self.diet_type}>"


# ─────────────────────────────────────────
# 4.USER SAVED INGREDIENTS
# ─────────────────────────────────────────
class UserIngredient(db.Model):
    __tablename__ = "user_ingredient"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.user_id"),
        nullable=False
    )

    ingredient_name = db.Column(
        db.String(150),
        nullable=False
    )

    unit = db.Column(db.String(20))

    estimated_price = db.Column(db.Float)

    def __repr__(self):
        return f"<UserIngredient {self.ingredient_name}>"


# ─────────────────────────────────────────
#5. MEAL
# ─────────────────────────────────────────
class Meal(db.Model):
    __tablename__ = "meal"

    meal_id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.user_id"),
        nullable=False
    )

    meal_name = db.Column(
        db.String(150),
        nullable=False
    )

    cuisine_type = db.Column(db.String(50))

    servings = db.Column(
        db.Integer,
        nullable=False
    )

    # Relationships
    ingredients = db.relationship(
        "MealIngredient",
        backref="meal",
        lazy=True,
        cascade="all, delete-orphan"
    )

    diet_tags = db.relationship(
        "MealDietTag",
        backref="meal",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Meal {self.meal_name}>"


# ─────────────────────────────────────────
# 6. INGREDIENT
# Market unit = how ingredient is sold
# Example:
# Rice → kg
# Oil  → liter
# Onion → piece
# ─────────────────────────────────────────
class Ingredient(db.Model):
    __tablename__ = "ingredient"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    market_unit = db.Column(
        db.String(20),
        nullable=False
    )

    unit_price_xaf = db.Column(
        db.Float,
        nullable=False
    )

    # Relationships
    allergens = db.relationship(
        "IngredientAllergen",
        backref="ingredient",
        lazy=True,
        cascade="all, delete-orphan"
    )

    conversions = db.relationship(
        "UnitConversion",
        backref="ingredient",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Ingredient {self.name}>"


# ─────────────────────────────────────────
# 7. UNIT CONVERSION
#
# Bridges:
# cooking unit → market unit
#
# Example:
# 1 tbsp oil = 0.015 liter
# 1 cup rice = 0.2 kg
# ─────────────────────────────────────────
class UnitConversion(db.Model):
    __tablename__ = "unit_conversion"

    id = db.Column(db.Integer, primary_key=True)

    ingredient_id = db.Column(
        db.Integer,
        db.ForeignKey("ingredient.id"),
        nullable=False
    )

    cooking_unit = db.Column(
        db.String(20),
        nullable=False
    )

    market_unit = db.Column(
        db.String(20),
        nullable=False
    )

    conversion_factor = db.Column(
        db.Float,
        nullable=False
    )

    note = db.Column(db.String(200))

    # Prevent duplicate unit mappings
    __table_args__ = (
        db.UniqueConstraint(
            "ingredient_id",
            "cooking_unit",
            name="unique_conversion_per_unit"
        ),
    )

    def __repr__(self):
        return (
            f"<UnitConversion "
            f"{self.cooking_unit}→"
            f"{self.market_unit} "
            f"x{self.conversion_factor}>"
        )


# ─────────────────────────────────────────
# 8. INGREDIENT ALLERGEN
# ─────────────────────────────────────────
class IngredientAllergen(db.Model):
    __tablename__ = "ingredient_allergen"

    id = db.Column(db.Integer, primary_key=True)

    ingredient_id = db.Column(
        db.Integer,
        db.ForeignKey("ingredient.id"),
        nullable=False
    )

    allergen = db.Column(
        db.String(100),
        nullable=False
    )

    def __repr__(self):
        return f"<IngredientAllergen {self.allergen}>"


# ─────────────────────────────────────────
# 9. MEAL INGREDIENT
#
# quantity + cooking_unit represent
# how ingredient appears in recipe
#
# Example:
# 2 tbsp oil
# 1 cup rice
# 3 cubes maggi
# ─────────────────────────────────────────
class MealIngredient(db.Model):
    __tablename__ = "meal_ingredient"

    meal_id = db.Column(
        db.Integer,
        db.ForeignKey("meal.meal_id"),
        primary_key=True
    )

    ingredient_id = db.Column(
        db.Integer,
        db.ForeignKey("ingredient.id"),
        primary_key=True
    )

    quantity = db.Column(
        db.Float,
        nullable=False
    )

    cooking_unit = db.Column(
        db.String(20),
        nullable=False
    )

    ingredient = db.relationship(
        "Ingredient",
        lazy=True
    )

    def __repr__(self):
        return (
            f"<MealIngredient "
            f"meal={self.meal_id} "
            f"ingredient={self.ingredient_id}>"
        )


# ─────────────────────────────────────────
# 10. MEAL DIET TAG
# ─────────────────────────────────────────
class MealDietTag(db.Model):
    __tablename__ = "meal_diet_tag"

    id = db.Column(db.Integer, primary_key=True)

    meal_id = db.Column(
        db.Integer,
        db.ForeignKey("meal.meal_id"),
        nullable=False
    )

    diet_type = db.Column(
        db.String(100),
        nullable=False
    )

    def __repr__(self):
        return f"<MealDietTag {self.diet_type}>"


# ─────────────────────────────────────────
# 11. MEAL PLAN
# ─────────────────────────────────────────
class MealPlan(db.Model):
    __tablename__ = "meal_plan"

    plan_id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.user_id"),
        nullable=False
    )

    start_date = db.Column(
        db.Date,
        nullable=False
    )

    end_date = db.Column(
        db.Date,
        nullable=False
    )

    total_budget = db.Column(
        db.Float,
        nullable=False
    )

    # NEW: how often the user cooks for this plan
    # Stored as a short string. Placed on MealPlan because
    # a user may have different cooking schedules per plan.
    # Allowed values: once_daily, twice_daily, every_2_days,
    # every_3_days, flexible. Default is "every_2_days".
    cooking_frequency = db.Column(
        db.String(50),
        nullable=True,
        default="every_2_days",
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    # Relationships
    plan_meals = db.relationship(
        "MealPlanMeal",
        backref="meal_plan",
        lazy=True,
        cascade="all, delete-orphan"
    )

    grocery_list = db.relationship(
        "GroceryList",
        backref="meal_plan",
        lazy=True,
        uselist=False,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<MealPlan {self.plan_id}>"


# ─────────────────────────────────────────
#11.MEAL PLAN MEAL
# ─────────────────────────────────────────
class MealPlanMeal(db.Model):
    __tablename__ = "meal_plan_meal"

    # ── Own auto-increment primary key ────────────────────
    # Previously plan_id + meal_id was the composite PK.
    # That prevented the same meal appearing twice in a plan.
    # Now each assignment row has its own unique ID,
    # allowing Ndolé on Monday AND Ndolé on Friday.
    id = db.Column(db.Integer, primary_key=True)

    plan_id = db.Column(
        db.Integer,
        db.ForeignKey("meal_plan.plan_id"),
        nullable=False
    )

    meal_id = db.Column(
        db.Integer,
        db.ForeignKey("meal.meal_id"),
        nullable=False
    )

    start_date = db.Column(
        db.Date,
        nullable=False
    )

    duration_days = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )

    meal = db.relationship(
        "Meal",
        lazy=True
    )

    def __repr__(self):
        return (
            f"<MealPlanMeal "
            f"plan={self.plan_id} "
            f"meal={self.meal_id} "
            f"date={self.start_date}>"
        )


# ─────────────────────────────────────────
# 12. GROCERY LIST
# ─────────────────────────────────────────
class GroceryList(db.Model):
    __tablename__ = "grocery_list"

    list_id = db.Column(
        db.Integer,
        primary_key=True
    )

    plan_id = db.Column(
        db.Integer,
        db.ForeignKey("meal_plan.plan_id"),
        nullable=False
    )

    total_price = db.Column(
        db.Float,
        default=0.0
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    items = db.relationship(
        "GroceryListItem",
        backref="grocery_list",
        lazy=True,
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<GroceryList {self.list_id}>"


# ─────────────────────────────────────────
# 13. GROCERY LIST ITEM
#
# quantity stored AFTER conversion
# into market unit
# ─────────────────────────────────────────
class GroceryListItem(db.Model):
    __tablename__ = "grocery_list_item"

    item_id = db.Column(
        db.Integer,
        primary_key=True
    )

    list_id = db.Column(
        db.Integer,
        db.ForeignKey("grocery_list.list_id"),
        nullable=False
    )

    ingredient_id = db.Column(
        db.Integer,
        db.ForeignKey("ingredient.id"),
        nullable=True
    )

    # For custom items added by users
    custom_name = db.Column(db.String(150))

    quantity = db.Column(
        db.Float,
        nullable=False
    )

    unit = db.Column(
        db.String(20)
    )

    unit_price = db.Column(
        db.Float,
        nullable=False
    )

    total_price = db.Column(
        db.Float,
        nullable=False
    )

    is_custom = db.Column(
        db.Boolean,
        default=False
    )

    ingredient = db.relationship(
        "Ingredient",
        lazy=True
    )

    def __repr__(self):
        return f"<GroceryListItem {self.item_id}>"