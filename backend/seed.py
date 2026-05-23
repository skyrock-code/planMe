"""
import_from_excel.py - Import data from Excel to database
Run once after updating Excel file

Usage: python import_from_excel.py
"""

import pandas as pd
from app import create_app
from extensions import db
from models import User, Meal, Ingredient, UnitConversion, MealIngredient

# Column mappings (fix mismatches HERE, not in Excel)
COLUMN_MAPPINGS = {
    # Excel column name -> Model field name
    'meal_name': 'meal_name',  # If Excel has 'name', change to: 'name': 'meal_name'
    'servings': 'servings',
    'cuisine_type': 'cuisine_type',
    'name': 'name',  # Ingredient column
    'market_unit': 'market_unit',
    'unit_price_xaf': 'unit_price_xaf',
    'cooking_unit': 'cooking_unit',
    'conversion_factor': 'conversion_factor',
    'quantity': 'quantity',
}

def import_from_excel(excel_path="../PlanMe_Database_v8.xlsx"):
    """Import all data from Excel file"""
    
    print(f" Reading Excel file: {excel_path}")
    
    # Read all sheets
    meals_df = pd.read_excel(excel_path, sheet_name="meals")
    ingredients_df = pd.read_excel(excel_path, sheet_name="ingredients")
    conversions_df = pd.read_excel(excel_path, sheet_name="unit_conversions")
    meal_ingredients_df = pd.read_excel(excel_path, sheet_name="meal_ingredients")
    
    app = create_app()
    with app.app_context():
        print("  Clearing existing data...")
        db.session.query(MealIngredient).delete()
        db.session.query(UnitConversion).delete()
        db.session.query(Meal).delete()
        db.session.query(Ingredient).delete()
        db.session.query(User).delete()
        db.session.commit()
        
        # Create admin user
        print(" Creating admin user...")
        admin = User(
            username="admin",
            email="admin@planme.com"
        )
        admin.set_password("admin123")
        db.session.add(admin)
        db.session.flush()
        print(f"  Admin user ID: {admin.user_id}")
        
        # Import meals
        print(f"🍽️  Importing {len(meals_df)} meals...")
        for _, row in meals_df.iterrows():
            meal = Meal(
                meal_id=row.get('meal_id'),
                user_id=admin.user_id,  # Required field
                meal_name=row.get('meal_name') or row.get('name'),  # Handle either column name
                servings=row.get('servings', 4),
                cuisine_type=row.get('cuisine_type') or row.get('category', 'traditional')
            )
            db.session.add(meal)
        db.session.commit()
        print(f" Imported {len(meals_df)} meals")
        
        # Import ingredients
        print(f" Importing {len(ingredients_df)} ingredients...")
        for _, row in ingredients_df.iterrows():
            ingredient = Ingredient(
                id=row.get('id'),
                name=row.get('name') or row.get('ingredient_name'),
                market_unit=row.get('market_unit', 'piece'),
                unit_price_xaf=row.get('unit_price_xaf') or row.get('price', 0)
            )
            db.session.add(ingredient)
        db.session.commit()
        print(f" Imported {len(ingredients_df)} ingredients")
        
        # Import unit conversions
        print(f" Importing {len(conversions_df)} unit conversions...")
        for _, row in conversions_df.iterrows():
            conversion = UnitConversion(
                id=row.get('id'),
                ingredient_id=row.get('ingredient_id'),
                cooking_unit=row.get('cooking_unit'),
                market_unit=row.get('market_unit'),
                conversion_factor=row.get('conversion_factor', 1.0),
                note=row.get('note', '')
            )
            db.session.add(conversion)
        db.session.commit()
        print(f" Imported {len(conversions_df)} unit conversions")
        
        # Import meal ingredients
        print(f" Importing {len(meal_ingredients_df)} meal-ingredient links...")
        for _, row in meal_ingredients_df.iterrows():
            meal_ingredient = MealIngredient(
                meal_id=row.get('meal_id'),
                ingredient_id=row.get('ingredient_id'),
                quantity=row.get('quantity', 1),
                cooking_unit=row.get('cooking_unit', 'piece')
            )
            db.session.add(meal_ingredient)
        db.session.commit()
        print(f"  Imported {len(meal_ingredients_df)} meal-ingredient links")
        
        print("\n" + "="*50)
        print(" DATABASE IMPORT COMPLETE!")
        print(f"   Users: {User.query.count()}")
        print(f"   Meals: {Meal.query.count()}")
        print(f"   Ingredients: {Ingredient.query.count()}")
        print(f"   Conversions: {UnitConversion.query.count()}")
        print(f"   Meal-Ingredients: {MealIngredient.query.count()}")
        print("="*50)

def check_excel_structure(excel_path="PlanMe_Database_v7-3.xlsx"):
    """Check what sheets and columns exist in Excel file"""
    xl = pd.ExcelFile(excel_path)
    print(f"\n Excel file: {excel_path}")
    print(f" Sheets found: {xl.sheet_names}")
    
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, nrows=2)
        print(f"\n   Sheet '{sheet}':")
        print(f"      Columns: {df.columns.tolist()}")
        print(f"      Row count: {pd.read_excel(xl, sheet_name=sheet).shape[0]}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--check":
        check_excel_structure()
    else:
        import_from_excel()