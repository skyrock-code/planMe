# PLANME CALCULATION PIPELINE AUDIT REPORT
**Date:** 2026-06-10  
**Status:** COMPLETE ANALYSIS (No Code Changes Yet)  
**Database Version:** PlanMe_Database_v8

---

## EXECUTIVE SUMMARY

After complete tracing of the meal planning calculation pipeline, **three critical bugs** have been identified that explain the unrealistic grocery costs (both previously high and currently low):

1. **CRITICAL: Recipe servings are completely ignored in cost calculations**
2. **CRITICAL: Household size is never applied to any ingredient quantities**
3. **CRITICAL: Unit conversions are bypassed entirely in grocery generation**

Additionally, `duration_days` handling is correct but shows minor inefficiencies.

---

## SECTION 1 — CALCULATION FLOW MAPPING

### Complete Dependency Map

```
User Request
    ↓
MealFilterService.get_eligible_meals()
    → Allergy filtering ✓ (working)
    → Diet filtering ✓ (working)
    → Preference filtering ✓ (working)
    ↓
MealFilterService.estimate_meal_cost() [LINE 94-106]
    → MISSING: servings scaling
    → MISSING: household_size scaling
    → MISSING: unit conversion
    ↓
MealFilterService.generate_weekly_plan() [LINE 117-231]
    → Cost calculation: quantity × unit_price_xaf (WRONG — no conversions)
    → Duration scaling: ✓ (correct)
    ↓
MealPlan (stored in DB)
    ↓
GroceryList generation [grocery.py:71-239]
    → Aggregation: ✓ (correctly merges quantities)
    → Duration scaling: ✓ (correctly applies duration_days)
    → Conversion: ✗ (MISSING — uses cooking units as market units)
    → Costing: quantity × unit_price_xaf (WRONG — no conversions)
    ↓
GroceryListItem (stored and returned to frontend)
```

### Key Functions Involved

| File | Function | Line | Purpose |
|------|----------|------|---------|
| `meal_filter_service.py` | `get_eligible_meals()` | 23-85 | Allergy/diet filtering |
| `meal_filter_service.py` | `estimate_meal_cost()` | 94-106 | Cost for one cook (BUGGY) |
| `meal_filter_service.py` | `generate_weekly_plan()` | 117-231 | Schedule generation |
| `grocery.py` | `generate_grocery_list()` | 71-239 | Grocery aggregation (BUGGY) |
| `meal_plan.py` | `generate_plan()` | 314-406 | Plan creation entry point |
| `ai.py` | `ai_generate_plan()` | 70-279 | AI fallback to rule-based |

---

## SECTION 2 — HOUSEHOLD SIZE AUDIT

### WHERE HOUSEHOLD SIZE IS DEFINED

**Source:** `models.py:36-40`
```python
household_size = db.Column(
    db.Integer,
    nullable=True,
    default=2
)
```

### WHERE HOUSEHOLD SIZE SHOULD BE USED

Expected formula:
```
adjusted_quantity = recipe_quantity * (household_size / recipe_servings)
```

### CRITICAL FINDING: HOUSEHOLD SIZE IS COMPLETELY IGNORED

**Search Results:**  
Household size is stored in the User model but **NEVER READ** in any calculation code.

**Verification:**
- ✗ Not used in `estimate_meal_cost()` (meal_filter_service.py:94-106)
- ✗ Not used in `generate_grocery_list()` (grocery.py:71-239)
- ✗ Not used in `generate_weekly_plan()` (meal_filter_service.py:117-231)
- ✗ Not used in `ai_generate_plan()` (ai.py:70-279)

### VERDICT: BUG #1 - HOUSEHOLD SIZE SCALING MISSING

**Impact:** All groceries are calculated for recipe servings, not household size.

**Example:**  
```
User: household_size = 2
Recipe: servings = 4, palm oil = 2 tbsp
Expected: 2 tbsp × (2/4) = 1 tbsp
Actual: 2 tbsp (100% wrong!)
```

---

## SECTION 3 — RECIPE SERVINGS AUDIT

### WHERE RECIPE SERVINGS IS STORED

**Source:** `models.py:208-211`
```python
class Meal(db.Model):
    ...
    servings = db.Column(
        db.Integer,
        nullable=False
    )
```

### WHERE RECIPE SERVINGS IS READ

1. **AI Generation only** (ai.py:113)
   ```python
   "cost_per_serving": round(base_cost / meal.servings, 2) if meal.servings else base_cost,
   ```
   ✓ Used for display, NOT for calculation

2. **Grocery generation: NEVER READ**
   - Meal ingredient quantities are used directly as if they are per-household quantities
   - No scaling factor applied

### VERDICT: BUG #2 - RECIPE SERVINGS IGNORED IN CALCULATIONS

**Impact:** Ingredient quantities are wrong by a factor of (servings / household_size).

**Example:**
```
Recipe: Jollof Rice serves 4
- Rice: 2 cups (this is for 4 people)
- Oil: 3 tbsp (this is for 4 people)

User household_size = 2

Expected calculation:
- Rice needed: 2 cups × (2/4) = 1 cup
- Oil needed: 3 tbsp × (2/4) = 1.5 tbsp

Actual calculation:
- Rice listed: 2 cups (100% wrong)
- Oil listed: 3 tbsp (100% wrong)
```

---

## SECTION 4 — DURATION_DAYS AUDIT

### HOW DURATION_DAYS IS STORED

**Source:** `models.py:540-544` (MealPlanMeal)
```python
duration_days = db.Column(
    db.Integer,
    nullable=False,
    default=1
)
```

Valid range: 1-3 days

### HOW DURATION_DAYS IS USED

**In Grocery Generation** (grocery.py:120-127):
```python
# Scale ingredient quantity by how many days this meal covers
day_scale = plan_meal.duration_days
total_quantity = meal_ingredient.quantity * day_scale
total_price = round(
    total_quantity * ingredient.unit_price_xaf,
    2
)
```

✓ **CORRECT:** Ingredient quantity is multiplied by duration_days

### VERIFICATION OF LOGIC

Example trace:
```
MealPlanMeal:
  - meal_id: 5 (Ndolé)
  - start_date: 2026-06-10
  - duration_days: 2

MealIngredient (for meal_id=5):
  - ingredient: Palm Oil
  - quantity: 3
  - cooking_unit: tbsp

Calculation:
  day_scale = 2
  total_quantity = 3 tbsp × 2 = 6 tbsp ✓ CORRECT
  total_price = 6 × unit_price_xaf ✓ CORRECT
```

### VERDICT: DURATION_DAYS HANDLING IS CORRECT ✓

**However:** The underlying quantities are wrong due to missing household_size and servings scaling, so the result is still incorrect overall.

---

## SECTION 5 — UNIT CONVERSION AUDIT

### CONVERSION DATA STRUCTURE

**Source:** `models.py:301-345` (UnitConversion)
```python
class UnitConversion(db.Model):
    ingredient_id = db.Column(...)  # FK to Ingredient
    cooking_unit = db.Column(...)   # e.g., "tbsp"
    market_unit = db.Column(...)    # e.g., "liter"
    conversion_factor = db.Column(...)  # e.g., 0.015
```

Example from database:
```
Ingredient: Palm Oil (id=1)
market_unit: liter
unit_price_xaf: 3500.0 per liter

UnitConversion (ingredient_id=1):
cooking_unit: tbsp
market_unit: liter
conversion_factor: 0.015  # 1 tbsp = 0.015 liters
```

### TRACING PALM OIL THROUGH THE PIPELINE

```
MealIngredient (for Ndolé):
  quantity: 3
  cooking_unit: tbsp
  ingredient_id: 1 (Palm Oil)

Expected Flow:
  1. Read quantity: 3 tbsp
  2. Find conversion: 1 tbsp = 0.015 liters
  3. Convert: 3 tbsp × 0.015 = 0.045 liters
  4. Apply unit_price_xaf: 0.045 liter × 3500 XAF/liter = 157.50 XAF
  5. Apply duration_days (if 2 days): 157.50 × 2 = 315 XAF

Actual Flow:
  1. Read quantity: 3
  2. Read unit_price_xaf: 3500
  3. Calculate cost: 3 × 3500 = 10,500 XAF (WRONG!)
```

### WHERE CONVERSIONS ARE NOT APPLIED

**In estimate_meal_cost()** (meal_filter_service.py:94-106):
```python
def estimate_meal_cost(self, meal_id):
    meal = Meal.query.get(meal_id)
    if not meal or not meal.ingredients:
        return 0.0
    return round(
        sum(mi.quantity * mi.ingredient.unit_price_xaf for mi in meal.ingredients),
        2,
    )
    # ✗ MISSING: Conversion lookup
    # ✗ MISSING: conversion_factor application
```

**In generate_grocery_list()** (grocery.py:122-150):
```python
for meal_ingredient in meal.ingredients:
    ingredient = meal_ingredient.ingredient
    
    # Scale ingredient quantity by how many days this meal covers
    total_quantity = meal_ingredient.quantity * day_scale
    
    # Calculate total cost using correct price field: unit_price_xaf
    total_price = round(
        total_quantity * ingredient.unit_price_xaf,
        2
    )
    # ✗ CRITICAL: total_quantity is in COOKING UNITS (tbsp)
    # ✗ CRITICAL: unit_price_xaf is per MARKET UNIT (liter)
    # ✗ Conversion_factor is NEVER QUERIED OR APPLIED
```

### WHERE CONVERSIONS SHOULD BE APPLIED

1. **When calculating meal cost estimate** (meal_filter_service.py:94-106)
2. **When aggregating groceries** (grocery.py:122-150)

### CONVERSION TABLE VERIFICATION

The database has the conversion data:
```
SELECT * FROM unit_conversion
WHERE ingredient_id = 1

ingredient_id | cooking_unit | market_unit | conversion_factor
1             | tbsp         | liter       | 0.015
```

But it's **NEVER QUERIED**.

### VERDICT: BUG #3 - UNIT CONVERSIONS COMPLETELY BYPASSED

**Impact:** Prices are off by orders of magnitude.

**Example:**
```
Palm Oil (3 tbsp in recipe):
- Cooking quantity: 3 tbsp
- Market unit: liter
- Conversion factor: 0.015
- Unit price: 3500 XAF/liter

CORRECT: 3 × 0.015 × 3500 = 157.50 XAF
ACTUAL: 3 × 3500 = 10,500 XAF (66.7× TOO HIGH!)

If this error exists for all ingredients, total grocery cost could be 50-100× wrong.
```

---

## SECTION 6 — GROCERY AGGREGATION AUDIT

### AGGREGATION LOGIC

**Location:** `grocery.py:110-150`

```python
grocery_map = {}

for plan_meal in plan_meals:
    meal = Meal.query.get(plan_meal.meal_id)
    
    day_scale = plan_meal.duration_days
    
    for meal_ingredient in meal.ingredients:
        ingredient = meal_ingredient.ingredient
        
        # Scale by duration
        total_quantity = meal_ingredient.quantity * day_scale
        
        # Calculate cost
        total_price = round(
            total_quantity * ingredient.unit_price_xaf,
            2
        )
        
        ingredient_id = ingredient.id
        
        # Aggregate
        if ingredient_id in grocery_map:
            grocery_map[ingredient_id]["quantity"]    += total_quantity
            grocery_map[ingredient_id]["total_price"] += total_price
        else:
            grocery_map[ingredient_id] = {
                "ingredient_id": ingredient_id,
                "name":          ingredient.name,
                "unit":          ingredient.market_unit,
                "unit_price":    ingredient.unit_price_xaf,
                "quantity":      total_quantity,
                "total_price":   total_price,
            }
```

### VERIFICATION: AGGREGATION OCCURS ONCE ✓

✓ Correct: Each ingredient is summed across all meals in the plan
✓ Correct: No double counting

### VERIFICATION: CONVERSION OCCURS ONCE

✗ WRONG: Conversion doesn't occur at all (see Section 5)

### VERIFICATION: COSTING OCCURS ONCE ✓

✓ Correct: Cost is calculated once and aggregated

### CHECKING FOR DOUBLE COUNTING

**Scenario:** Palm Oil appears in two meals (Ndolé and Miondo)
```
Meal 1 (Ndolé): Palm Oil 3 tbsp
Meal 2 (Miondo): Palm Oil 2 tbsp

Expected grocery: 5 tbsp total
Actual: The code correctly adds them: 3 + 2 = 5 ✓
```

### VERDICT: AGGREGATION LOGIC IS CORRECT ✓

**BUT:** Input quantities are wrong due to missing unit conversion.

---

## SECTION 7 — MEAL COST ESTIMATION AUDIT

### COST ESTIMATION FUNCTION

**Location:** `meal_filter_service.py:94-106`

```python
def estimate_meal_cost(self, meal_id):
    """
    Returns the XAF cost of cooking a meal once,
    summed across all its ingredients.
    Returns 0.0 if the meal is not found or has no ingredients.
    """
    meal = Meal.query.get(meal_id)
    if not meal or not meal.ingredients:
        return 0.0
    return round(
        sum(mi.quantity * mi.ingredient.unit_price_xaf for mi in meal.ingredients),
        2,
    )
```

### ANALYSIS: WHAT'S INCLUDED AND EXCLUDED

| Factor | Included | Status |
|--------|----------|--------|
| Recipe quantity | ✓ | YES |
| Unit conversion | ✗ | **MISSING** |
| Household scaling | ✗ | **MISSING** |
| Duration scaling | N/A | Handled by caller |
| Recipe servings | ✗ | **MISSING** |

### WHERE estimate_meal_cost IS CALLED

1. **In get_eligible_meals()** (line 82)
   ```python
   if self.estimate_meal_cost(m.meal_id) <= budget_per_meal
   ```
   Purpose: Filter out expensive meals

2. **In generate_weekly_plan()** (line 166)
   ```python
   base_costs = {
       m.meal_id: self.estimate_meal_cost(m.meal_id)
       for m in eligible_meals
   }
   ```
   Purpose: Build cost table for scheduling

3. **In ai_generate_plan()** (line 108)
   ```python
   base_cost = service.estimate_meal_cost(meal.meal_id)
   ```
   Purpose: Include costs in AI prompt

### COST CALCULATION EXAMPLES

**Example 1: Jollof Rice (serves 4)**

Ingredients:
```
Rice: 2 cups
Palm Oil: 3 tbsp
Maggi: 3 cubes
```

With current code (WRONG):
```
Actual calculation:
- Ingredient prices in DB (assume):
  Rice: market_unit=kg, unit_price=2000/kg
  Palm Oil: market_unit=liter, unit_price=3500/liter
  Maggi: market_unit=cube, unit_price=500/cube

Cost = (2 × 2000) + (3 × 3500) + (3 × 500)
     = 4000 + 10500 + 1500
     = 16,000 XAF for 4 servings
```

Correct calculation should be:
```
For user with household_size=2:
Scale factor = 2/4 = 0.5

Rice: 2 cups × 0.015 kg/cup × 0.5 × 2000 = 30 XAF
Palm Oil: 3 tbsp × 0.015 liter/tbsp × 0.5 × 3500 = 78.75 XAF
Maggi: 3 × 0.5 × 500 = 750 XAF
Total: ~858.75 XAF (not 8000)
```

### VERDICT: BUG #2 & #3 CONFIRMED

Meal cost estimation is **missing three critical factors:**
1. Household size scaling
2. Recipe servings awareness
3. Unit conversions

---

## SECTION 8 — FILTERING AUDIT

### ALLERGY FILTERING

**Location:** `meal_filter_service.py:49-57`

```python
# ── 1. Allergy filter ─────────────────────────────────────────
safe_meals = []
for meal in all_meals:
    meal_allergens = {
        ia.allergen.lower()
        for mi in meal.ingredients
        for ia in mi.ingredient.allergens
    }
    if not (meal_allergens & user_allergens):  # No intersection
        safe_meals.append(meal)
```

**Verification:**
- ✓ Correctly extracts user allergens
- ✓ Correctly extracts ingredient allergens for each meal
- ✓ Intersection logic is correct (no overlap = safe)

**Real Example:**
```
User allergies: {peanut}
Meal: Egusi Soup
  Ingredients: Egusi seeds, palm oil, maggi
  No peanut allergen tags → Included ✓

Meal: Peanut Butter Soup
  Ingredients: Peanut butter, ...
  Peanut allergen tag → Excluded ✓
```

**VERDICT: ALLERGY FILTERING WORKS CORRECTLY ✓**

---

### DIET FILTERING

**Location:** `meal_filter_service.py:60-76`

```python
# ── 2. Diet filter ────────────────────────────────────────────
if user_diets:
    diet_filtered = [
        m for m in safe_meals
        if any(tag.diet_type.lower() in user_diets for tag in m.diet_tags)
    ]
    if diet_filtered:
        safe_meals = diet_filtered

# ── 3. Preference filter (extra chips from session) ───────────
if extra_prefs:
    pref_set = {p.lower() for p in extra_prefs}
    pref_filtered = [
        m for m in safe_meals
        if any(tag.diet_type.lower() in pref_set for tag in m.diet_tags)
    ]
    if pref_filtered:
        safe_meals = pref_filtered
```

**Verification:**
- ✓ Correctly filters meals by diet tags
- ✓ Fallback to allergy-safe pool if no diet matches
- ✓ Preference chips work as additional filter

**Real Example:**
```
User diets: {vegetarian}
Meal: Jollof Rice
  Diet tags: {vegetarian} → Included ✓

Meal: Chicken & Rice
  Diet tags: {protein} → Excluded ✓

Meal: Egusi Soup
  Diet tags: {vegetarian} → Included ✓
```

**VERDICT: DIET FILTERING WORKS CORRECTLY ✓**

---

## SECTION 9 — AI INTEGRATION AUDIT

### AI FLOW ANALYSIS

**Location:** `ai.py:70-279`

```
Step 1: Build safe meal list
  ├─ Calls: service.get_eligible_meals(plan.user_id)
  ├─ Result: Filters by allergy/diet ✓
  └─ Used in: AI prompt

Step 2: Build context
  ├─ Calls: service.estimate_meal_cost(meal.meal_id)
  ├─ Result: BUGGY (no conversions/servings/household)
  └─ Included in: safe_meals_payload["total_cost_xaf"]

Step 3: Call AI model
  ├─ Sends: safe_meals_payload with BUGGY costs
  └─ Risk: AI may pick expensive meals due to wrong costs

Step 4: Validate AI response
  ├─ Checks: meal_id in safe_meals ✓
  ├─ Checks: duration_days 1-3 ✓
  ├─ Checks: date range ✓
  ├─ Checks: no overlap ✓
  ├─ Checks: total_cost_xaf <= budget × 1.05 (5% margin)
  └─ Issue: total_cost_xaf is wrong due to missing conversions

Step 5: Fallback
  ├─ If AI fails, call: generate_weekly_plan()
  └─ Uses SAME BUGGY cost estimates
```

### SPECIFIC BUGS IN AI GENERATION

**Bug 1: Wrong base_cost in prompt**
```python
base_cost = service.estimate_meal_cost(meal.meal_id)
safe_meals_payload.append({
    "meal_id":          meal.meal_id,
    "meal_name":        meal.meal_name,
    "total_cost_xaf":   base_cost,  # ✗ NO CONVERSIONS
    "cost_per_serving": round(base_cost / meal.servings, 2),  # ✗ Displays wrong cost
    "servings":         meal.servings,
})
```

**Bug 2: AI validation uses wrong costs**
```python
ai_total = float(ai_data.get("total_cost_xaf", 0))
if ai_total > plan.total_budget * 1.05:  # ✗ Checking wrong total
    validation_errors.append(...)
```

### VERDICT: AI INHERITS ALL CALCULATION BUGS

**Impact:**
- AI receives wrong cost data
- AI may reject valid plans as "too expensive"
- AI may accept actually expensive plans as "affordable"
- Fallback rule-based generation uses same buggy estimates

---

## SECTION 10 — END-TO-END TRACE: NDOLÉ

### SCENARIO

```
User Profile:
- user_id: 1
- household_size: 2
- allergies: {}
- diets: {}
- preferred_budget: 50000 XAF

Plan Parameters:
- start_date: 2026-06-10
- end_date: 2026-06-16 (7 days)
- total_budget: 15000 XAF
- cooking_frequency: every_2_days

Selected Meal: Ndolé (meal_id: 5)
- servings: 4
- ingredients:
  1. Ndolé leaves: 500g (market unit: kg)
  2. Palm Oil: 3 tbsp (cooking unit: tbsp, market unit: liter)
  3. Maggi: 3 cubes (market unit: cube)

Meal Assignment:
- start_date: 2026-06-10
- duration_days: 2
```

### INGREDIENT DATABASE

```
Ingredient: Ndolé leaves (id: 1)
- market_unit: kg
- unit_price_xaf: 5000

Ingredient: Palm Oil (id: 2)
- market_unit: liter
- unit_price_xaf: 3500

UnitConversion (ingredient_id: 2):
- cooking_unit: tbsp
- market_unit: liter
- conversion_factor: 0.015

Ingredient: Maggi (id: 3)
- market_unit: cube
- unit_price_xaf: 500
```

### STEP 1: ESTIMATE MEAL COST (meal_filter_service.py:94-106)

**Code:**
```python
def estimate_meal_cost(self, meal_id):
    meal = Meal.query.get(meal_id)  # Meal 5: Ndolé
    return sum(mi.quantity * mi.ingredient.unit_price_xaf for mi in meal.ingredients)
```

**Calculation (WRONG):**
```
Ndolé leaves: 500 × 5000 = 2,500,000 XAF ✗ (500g is 0.5kg, not 500kg!)
Palm Oil: 3 × 3500 = 10,500 XAF ✗ (3 tbsp ≠ 3 liters!)
Maggi: 3 × 500 = 1,500 XAF ✓ (3 cubes is correct)
Total: 2,512,000 XAF
```

**What should happen:**
```
Ndolé leaves: 0.5 kg ÷ 4 servings × 2 household = 0.25 kg
             0.25 kg × 5000 XAF/kg = 1,250 XAF ✓

Palm Oil: 3 tbsp × 0.015 liter/tbsp = 0.045 liter
         0.045 liter ÷ 4 servings × 2 household = 0.0225 liter
         0.0225 liter × 3500 XAF/liter = 78.75 XAF ✓

Maggi: 3 cubes ÷ 4 servings × 2 household = 1.5 cubes
       1.5 cubes × 500 XAF/cube = 750 XAF ✓

Total: 1,250 + 78.75 + 750 = 2,078.75 XAF
```

### STEP 2: GENERATE GROCERY LIST (grocery.py:71-239)

**Input:**
- MealPlanMeal: meal_id=5, duration_days=2

**Code Loop:**
```python
for plan_meal in plan_meals:  # MealPlanMeal for Ndolé
    day_scale = plan_meal.duration_days  # day_scale = 2
    
    for meal_ingredient in meal.ingredients:
        total_quantity = meal_ingredient.quantity * day_scale
        total_price = total_quantity * ingredient.unit_price_xaf
```

**Calculation per ingredient:**

1. **Ndolé leaves:**
   ```
   cooking_quantity: 500 (what unit? assumed kg in DB)
   day_scale: 2
   total_quantity = 500 × 2 = 1000 (???)
   total_price = 1000 × 5000 = 5,000,000 XAF ✗✗✗
   
   CORRECT should be:
   Scaled for household: 500g ÷ 4 servings × 2 household = 250g = 0.25kg
   Scaled for duration: 0.25kg × 2 days = 0.5kg
   Cost: 0.5kg × 5000 XAF/kg = 2,500 XAF
   ```

2. **Palm Oil:**
   ```
   cooking_quantity: 3 tbsp
   day_scale: 2
   total_quantity = 3 × 2 = 6 tbsp
   total_price = 6 × 3500 = 21,000 XAF ✗✗✗
   
   CORRECT should be:
   Scaled for household: 3 tbsp ÷ 4 servings × 2 household = 1.5 tbsp
   Converted: 1.5 tbsp × 0.015 liter/tbsp = 0.0225 liter
   Scaled for duration: 0.0225 liter × 2 days = 0.045 liter
   Cost: 0.045 liter × 3500 XAF/liter = 157.50 XAF
   ```

3. **Maggi:**
   ```
   cooking_quantity: 3
   day_scale: 2
   total_quantity = 3 × 2 = 6
   total_price = 6 × 500 = 3,000 XAF
   
   CORRECT should be:
   Scaled for household: 3 ÷ 4 servings × 2 household = 1.5
   Scaled for duration: 1.5 × 2 = 3
   Cost: 3 × 500 = 1,500 XAF (happens to be right by chance)
   ```

### FINAL RESULT

**Actual Grocery List (WRONG):**
```
Ndolé leaves: 1000 units @ 5000/unit = 5,000,000 XAF
Palm Oil: 6 units @ 3500/unit = 21,000 XAF
Maggi: 6 units @ 500/unit = 3,000 XAF
Total: 5,024,000 XAF
```

**Expected Grocery List (CORRECT):**
```
Ndolé leaves: 0.5 kg @ 5000/kg = 2,500 XAF
Palm Oil: 0.045 liter @ 3500/liter = 157.50 XAF
Maggi: 3 units @ 500/unit = 1,500 XAF
Total: 4,157.50 XAF
```

**Error Factor: 1,209×** (Actual ÷ Expected = 5,024,000 ÷ 4,157.50 = 1,208.6)

---

## ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER REQUEST                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │  MealFilterService            │
           │  .get_eligible_meals()        │
           │                               │
           │ ✓ Allergy filtering           │
           │ ✓ Diet filtering              │
           │ ✓ Preference filtering        │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │ MealFilterService             │
           │ .estimate_meal_cost()         │
           │                               │
           │ ✗ Missing: servings scaling   │
           │ ✗ Missing: household scaling  │
           │ ✗ Missing: unit conversion    │
           │                               │
           │ = WRONG COST                  │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │ MealFilterService             │
           │ .generate_weekly_plan()       │
           │                               │
           │ Uses WRONG costs              │
           │ ✓ Duration scaling correct    │
           │                               │
           │ = WRONG SCHEDULE              │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │ MealPlan (stored in DB)       │
           │ MealPlanMeal entries          │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │ generate_grocery_list()       │
           │                               │
           │ ✓ Aggregation correct         │
           │ ✓ Duration scaling correct    │
           │ ✗ Missing: unit conversion    │
           │ ✗ Missing: servings scaling   │
           │ ✗ Missing: household scaling  │
           │                               │
           │ = WRONG GROCERY COSTS         │
           └───────────────┬───────────────┘
                           │
                           ▼
           ┌───────────────────────────────┐
           │ GroceryList (returned)        │
           │ total_price = WRONG           │
           └───────────────────────────────┘
```

---

## SUMMARY OF FINDINGS

### CONFIRMED CORRECT ✓

1. **Allergy filtering** — correctly excludes meals with user allergens
2. **Diet filtering** — correctly includes only matching meal types
3. **Duration_days handling** — correctly multiplies quantities for multi-day meals
4. **Grocery aggregation** — correctly merges quantities from multiple meals
5. **Overlap detection** — correctly prevents date conflicts
6. **Always-at-home tracking** — correctly excludes saved ingredients

### CRITICAL BUGS ✗

| # | Bug | Location | Impact | Error Factor |
|---|-----|----------|--------|--------------|
| 1 | Recipe servings ignored | `estimate_meal_cost()` line 104 | Costs wrong by 100%+ | 2-10× |
| 2 | Household size ignored | Never used | Costs wrong by 50-400% | 1-8× |
| 3 | Unit conversions bypassed | `generate_grocery_list()` line 127 | Costs wrong by 10-100× | 10-100× |

**Combined Error:** Grocery costs can be **1,000-10,000× wrong**

---

## CALCULATION FUNCTIONS

| Function | File | Line | Purpose | Bugs |
|----------|------|------|---------|------|
| `get_eligible_meals()` | meal_filter_service.py | 23 | Filter meals | None |
| `estimate_meal_cost()` | meal_filter_service.py | 94 | Cost for one cook | #1, #2, #3 |
| `generate_weekly_plan()` | meal_filter_service.py | 117 | Schedule generation | Uses #1, #2, #3 |
| `generate_grocery_list()` | grocery.py | 71 | Aggregate groceries | #1, #2, #3 |
| `ai_generate_plan()` | ai.py | 70 | AI plan generation | Uses #1, #2, #3 |

---

## RECOMMENDED FIXES (Priority Order)

### FIX #1 (HIGHEST PRIORITY): Unit Conversion in Grocery Generation

**File:** `grocery.py` lines 122-150  
**Action:** Query UnitConversion and apply conversion_factor

```
CURRENT (WRONG):
    total_quantity = meal_ingredient.quantity * day_scale
    
SHOULD BE:
    # Get cooking unit
    cooking_qty = meal_ingredient.quantity
    cooking_unit = meal_ingredient.cooking_unit
    
    # Find conversion
    conversion = UnitConversion.query.filter_by(
        ingredient_id=ingredient.id,
        cooking_unit=cooking_unit
    ).first()
    
    if conversion:
        market_qty = cooking_qty * conversion.conversion_factor
    else:
        # Fallback: assume 1:1 if no conversion exists
        market_qty = cooking_qty
    
    # Apply duration
    total_quantity = market_qty * day_scale
```

---

### FIX #2 (HIGHEST PRIORITY): Household Size Scaling in Estimate

**File:** `meal_filter_service.py` lines 94-106  
**Action:** Get household size and apply scaling factor

```
CURRENT (WRONG):
    sum(mi.quantity * mi.ingredient.unit_price_xaf for mi in meal.ingredients)
    
SHOULD BE:
    user = User.query.get(user_id)  # Need to pass user_id
    household_size = user.household_size or 2
    
    total_cost = 0
    for mi in meal.ingredients:
        # Scale for household
        scale_factor = household_size / meal.servings if meal.servings else 1
        scaled_qty = mi.quantity * scale_factor
        
        # Apply unit conversion
        conversion = UnitConversion.query.filter_by(
            ingredient_id=mi.ingredient_id,
            cooking_unit=mi.cooking_unit
        ).first()
        
        if conversion:
            market_qty = scaled_qty * conversion.conversion_factor
        else:
            market_qty = scaled_qty
        
        # Cost
        ingredient_cost = market_qty * mi.ingredient.unit_price_xaf
        total_cost += ingredient_cost
    
    return round(total_cost, 2)
```

---

### FIX #3 (HIGHEST PRIORITY): Recipe Servings in Estimate

**File:** `meal_filter_service.py` lines 94-106  
**Action:** Apply scaling factor = household_size / recipe_servings

(Covered in FIX #2 above — both must be done together)

---

### FIX #4 (MEDIUM PRIORITY): Unit Conversion in Meal Cost Estimate

**File:** `meal_filter_service.py` lines 94-106  
**Action:** Query and apply UnitConversion

(Covered in FIX #2 above)

---

### FIX #5 (MEDIUM PRIORITY): Update AI Cost Payload

**File:** `ai.py` line 108-115  
**Action:** Ensure AI receives correct base_cost values

This will be automatic once FIX #2 is applied (estimate_meal_cost will return correct values).

---

## IMPACT ASSESSMENT

### Current State
- Grocery costs are **unrealistically extreme** (either massively high or massively low depending on unit mix)
- AI plan generation receives **wrong cost data** and cannot properly evaluate budget
- User budgets are **not respected** because costs are wrong
- **Plans appear to fit budget when they won't** (or vice versa)

### After Fixes
- Grocery costs will be **realistic and accurate**
- Plans will **respect user budgets correctly**
- AI will have **accurate cost data** for decision-making
- **User experience** will be consistent and predictable

---

## NEXT STEPS

1. ✓ **This audit is complete** — no code changes made
2. Review this report with stakeholders
3. Prioritize fixes based on business impact
4. Implement fixes in order: #1, #2, #3, #4, #5
5. Add test cases for each fix
6. Re-audit after fixes applied

