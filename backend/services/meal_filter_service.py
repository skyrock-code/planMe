import random
from datetime import date, timedelta
from models import Meal, User, UnitConversion


class MealFilterService:
    """
    Encapsulates all meal filtering and schedule generation logic
    so that route handlers stay thin and the planning rules are
    testable in isolation.
    """

    # ─────────────────────────────────────────
    # get_eligible_meals
    #
    # Returns all Meal objects that pass both
    # the user's allergy filter and their dietary
    # preference filter.
    #
    # budget_per_meal — when provided, also drops
    # meals whose single-cook cost exceeds it.
    # ─────────────────────────────────────────
    def get_eligible_meals(self, user_id, budget_per_meal=None, extra_prefs=None):
        """
        Returns a list of Meal objects eligible for the given user.

        Filtering order:
        1. Allergy filter  — remove meals containing any user allergen
        2. Diet filter     — keep only meals matching user diet tags
                             (skipped if the user has no diet preferences;
                              falls back to allergy-safe pool if no meals
                              match so the user always gets a result)
        3. Preference filter — when extra_prefs is provided (e.g. chip selections),
                               narrow to meals matching those tags; silently falls
                               back to step-2 result when nothing matches
        4. Budget filter   — remove meals exceeding budget_per_meal
                             (only applied when budget_per_meal is given)
        """
        user = User.query.get(user_id)
        if not user:
            return []

        user_allergens = {ua.allergen.lower() for ua in user.allergies}
        user_diets     = {ud.diet_type.lower() for ud in user.diets}

        all_meals = Meal.query.all()

        # ── 1. Allergy filter ─────────────────────────────────────────
        safe_meals = []
        for meal in all_meals:
            meal_allergens = {
                ia.allergen.lower()
                for mi in meal.ingredients
                for ia in mi.ingredient.allergens
            }
            if not (meal_allergens & user_allergens):
                safe_meals.append(meal)

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

        # ── 4. Budget filter (optional) ───────────────────────────────
        if budget_per_meal is not None:
            safe_meals = [
                m for m in safe_meals
                if self.estimate_meal_cost(m.meal_id, user_id) <= budget_per_meal
            ]

        return safe_meals

    # ─────────────────────────────────────────
    # estimate_meal_cost
    #
    # Calculates the total ingredient cost for
    # one cook of a meal (duration_days scaling
    # is handled by the caller).
    # ─────────────────────────────────────────
    def estimate_meal_cost(self, meal_id, user_id=None):
        """
        Returns the XAF cost of cooking a meal once for the user's household,
        summed across all its ingredients.

        Applies:
        - Unit conversions (cooking unit → market unit)
        - Household size scaling
        - Recipe servings normalization

        Returns 0.0 if the meal is not found or has no ingredients.
        """
        meal = Meal.query.get(meal_id)
        if not meal or not meal.ingredients:
            return 0.0

        # Get household size for scaling
        household_size = 4  # default
        if user_id:
            user = User.query.get(user_id)
            if user and user.household_size:
                household_size = user.household_size

        total_cost = 0.0
        for mi in meal.ingredients:
            ingredient = mi.ingredient

            # Find unit conversion from cooking unit to market unit
            conversion = UnitConversion.query.filter_by(
                ingredient_id=ingredient.id,
                cooking_unit=mi.cooking_unit
            ).first()

            # Convert cooking quantity to market quantity
            if conversion:
                market_quantity = mi.quantity * conversion.conversion_factor
            else:
                market_quantity = mi.quantity

            # Scale from recipe servings to household size
            if meal.servings and meal.servings > 0:
                scale_factor = household_size / meal.servings
            else:
                scale_factor = 1.0

            scaled_quantity = market_quantity * scale_factor

            # Calculate ingredient cost
            ingredient_cost = scaled_quantity * ingredient.unit_price_xaf
            total_cost += ingredient_cost

        return round(total_cost, 2)

    # ─────────────────────────────────────────
    # generate_weekly_plan
    #
    # Builds a meal schedule for a date range
    # (defaults to 7 days from today).
    #
    # Returns a list of slot dicts — does NOT
    # write anything to the database.
    # ─────────────────────────────────────────
    def generate_weekly_plan(
        self,
        user_id,
        budget,
        cooking_frequency,
        start_date=None,
        end_date=None,
        extra_prefs=None,
        preferred_meal_ids=None,
    ):
        """
        Generates a meal schedule for the given user and budget.

        Parameters
        ----------
        user_id           : int
        budget            : float   — total XAF budget for the period
        cooking_frequency : str     — once_daily | twice_daily |
                                      every_2_days | every_3_days | flexible
        start_date        : date    — defaults to today
        end_date          : date    — defaults to start_date + 6 days (7-day plan)
        extra_prefs       : list    — optional preference chip values to narrow meal
                                      selection (e.g. ["vegetarian", "spicy"])
        preferred_meal_ids : list   — optional meal_ids preferred by AI or user
                                      (meals are prioritized but fallback pool remains)

        Returns
        -------
        List of slot dicts:
        [
          {
            "date":          date,
            "duration_days": int,
            "meal_id":       int,
            "meal_name":     str,
            "cost":          float,   # cost for this slot (base cost × duration)
          },
          ...
        ]
        Returns an empty list when no eligible meals exist.
        """
        if start_date is None:
            start_date = date.today()
        if end_date is None:
            end_date = start_date + timedelta(days=6)

        eligible_meals = self.get_eligible_meals(user_id, extra_prefs=extra_prefs)
        if not eligible_meals:
            return []

        # Prioritize preferred meals if provided by AI
        if preferred_meal_ids:
            preferred_set = set(preferred_meal_ids)
            preferred = [m for m in eligible_meals if m.meal_id in preferred_set]
            others = [m for m in eligible_meals if m.meal_id not in preferred_set]
            eligible_meals = preferred + others

        # Precompute single-cook costs to avoid repeated DB queries per slot
        base_costs = {
            m.meal_id: self.estimate_meal_cost(m.meal_id, user_id)
            for m in eligible_meals
        }

        def slot_cost(meal, dur):
            return round(base_costs[meal.meal_id] * dur, 2)

        # ── Build cooking schedule ────────────────────────────────────
        # step     = days to advance between cooking sessions
        # duration = how many days one batch covers
        # twice    = assign two separate meals on the same cooking day
        freq_config = {
            'once_daily':   {'step': 1, 'duration': 1, 'twice': False},
            'twice_daily':  {'step': 1, 'duration': 1, 'twice': True},
            'every_2_days': {'step': 2, 'duration': 2, 'twice': False},
            'every_3_days': {'step': 3, 'duration': 3, 'twice': False},
            'flexible':     {'step': 2, 'duration': 2, 'twice': False},
        }
        cfg      = freq_config.get(cooking_frequency, freq_config['every_2_days'])
        step     = cfg['step']
        duration = cfg['duration']
        twice    = cfg['twice']

        raw_schedule = []
        current = start_date
        while current <= end_date:
            actual_dur = min(duration, (end_date - current).days + 1)
            raw_schedule.append((current, actual_dur))
            if twice:
                raw_schedule.append((current, actual_dur))
            current += timedelta(days=step)

        # ── Assign meals with budget awareness ────────────────────────
        remaining    = float(budget)
        plan         = []
        last_meal_id = None

        for cook_date, dur in raw_schedule:
            # Prefer meals that fit within remaining budget
            affordable = [m for m in eligible_meals if slot_cost(m, dur) <= remaining]

            # Fall back to the three cheapest options when nothing fits
            if not affordable:
                affordable = sorted(eligible_meals, key=lambda m: slot_cost(m, dur))[:3]

            # Avoid repeating the immediately previous meal when possible
            candidates = affordable
            if len(affordable) > 1 and last_meal_id is not None:
                no_repeat = [m for m in affordable if m.meal_id != last_meal_id]
                if no_repeat:
                    candidates = no_repeat

            chosen = random.choice(candidates)
            cost   = slot_cost(chosen, dur)

            plan.append({
                'date':          cook_date,
                'duration_days': dur,
                'meal_id':       chosen.meal_id,
                'meal_name':     chosen.meal_name,
                'cost':          cost,
            })
            remaining    -= cost
            last_meal_id  = chosen.meal_id

        return plan
