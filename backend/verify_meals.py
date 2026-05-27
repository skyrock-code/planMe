#!/usr/bin/env python
"""Verify meals in the database."""

from app import create_app
from models import Meal

app = create_app()
with app.app_context():
    meals = Meal.query.order_by(Meal.meal_id).all()
    print(f'Total meals: {len(meals)}')
    print()
    for m in meals:
        print(f'  ID {m.meal_id:3d}: {m.meal_name}')
    
    # Check for gaps in IDs
    ids = [m.meal_id for m in meals]
    expected = list(range(min(ids), max(ids) + 1))
    missing  = [i for i in expected if i not in ids]
    if missing:
        print(f'Missing IDs: {missing}')
    else:
        print('No gaps in meal IDs')
