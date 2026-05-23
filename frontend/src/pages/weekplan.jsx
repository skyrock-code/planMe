/**
 * @file WeekPlan.jsx
 * @description Weekly Meal Plan screen for the PlanMe app.
 *              Shows a 7-day calendar strip, a scrollable feed of meal
 *              cards per day, and action buttons to edit the plan or
 *              generate a grocery list.
 *              Matches the weekplan.html design exactly.
 * @module pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopAppBar from "../components/layout/TopAppBar";
import MealCard from "../components/ui/MealCard";
import Button from "../components/ui/Button";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Hardcoded data for UI development — will be replaced with API calls in Phase 4.

/**
 * The 7 days shown in the calendar strip.
 * `todayIndex` marks which day gets the green active style.
 */
const WEEK_DAYS = [
  { short: "Mon", date: 23 },
  { short: "Tue", date: 24 },
  { short: "Wed", date: 25 },
  { short: "Thu", date: 26 },
  { short: "Fri", date: 27 },
  { short: "Sat", date: 28 },
  { short: "Sun", date: 29 },
];

const TODAY_INDEX = 0; // Monday is "today" in the mock data

/**
 * Meal plan entries for the week.
 * Each entry maps to a day index (0 = Mon ... 6 = Sun).
 * `meal: null` means no meal planned — shows an "Add a meal" placeholder.
 */
const MEAL_PLAN = [
  {
    dayIndex: 0,
    dayLabel: "Monday, Oct 23",
    isToday: true,
    meal: {
      mealName: "Ndolé with Miondo",
      mealType: "Dinner",
      estimatedCost: 3500,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200",
      imageAlt: "Traditional Cameroonian Ndolé dish",
    },
  },
  {
    dayIndex: 1,
    dayLabel: "Tuesday, Oct 24",
    isToday: false,
    meal: {
      mealName: "Achu with Yellow Soup",
      mealType: "Lunch",
      estimatedCost: 4500,
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200",
      imageAlt: "Yellow achu soup with pounded cocoyams",
    },
  },
  {
    dayIndex: 2,
    dayLabel: "Wednesday, Oct 25",
    isToday: false,
    meal: {
      mealName: "Poulet DG",
      mealType: "Dinner",
      estimatedCost: 6000,
      imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200",
      imageAlt: "Poulet DG chicken and plantain stir fry",
    },
  },
  {
    dayIndex: 3,
    dayLabel: "Thursday, Oct 26",
    isToday: false,
    meal: null, // No meal planned — shows add placeholder
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * WeekPlan page component.
 *
 * Shows the generated weekly meal plan with:
 * - A sticky top bar with date range
 * - A horizontal 7-day calendar strip for day selection
 * - A scrollable list of meal cards per planned day
 * - "Add a meal" placeholder for empty days
 * - Fixed bottom action bar (Edit Plan + Generate Grocery List)
 * - Bottom navigation bar
 *
 * @component
 * @returns {JSX.Element}
 */
export default function WeekPlan() {
  const navigate = useNavigate();

  // Track which calendar day is selected
  const [selectedDay, setSelectedDay] = useState(TODAY_INDEX);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">

      {/* ── Sticky top bar with date range ── */}
      <TopAppBar
        title="Weekly Meal Plan"
        subtitle="October 23 - 29, 2025"
        showBack={false}
        rightIcon="calendar_month"
        onRightAction={() => {}}
      />

      {/* ── 7-day calendar strip ── */}
      <div className="px-4 py-2">
        <div
          className="flex gap-2 overflow-x-auto pb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {WEEK_DAYS.map((day, index) => {
            const isActive = index === selectedDay;
            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDay(index)}
                aria-label={`${day.short} ${day.date}`}
                aria-pressed={isActive}
                className={[
                  "flex flex-col items-center justify-center min-w-[50px] h-20 rounded-full transition-all",
                  isActive
                    ? "bg-primary text-white shadow-lg"
                    : "bg-white dark:bg-white/5 border border-[#618968]/20 text-[#111812] dark:text-white",
                ].join(" ")}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-white" : "text-[#618968]"}`}>
                  {day.short}
                </span>
                <span className="text-xl font-extrabold">{day.date}</span>

                {/* Dot indicator for days that have a meal */}
                {index === TODAY_INDEX && (
                  <div className={`w-1 h-1 rounded-full mt-1 ${isActive ? "bg-white" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Meal plan feed ── */}
      <main className="flex flex-col gap-2 px-4 pb-40">
        {MEAL_PLAN.map((entry) => (
          <div key={entry.dayIndex}>

            {/* Day label + "Today" badge */}
            <h3 className="text-[#111812] dark:text-white text-base font-bold py-3 flex items-center gap-2">
              {entry.dayLabel}
              {entry.isToday && (
                <span className="text-[10px] bg-primary/20 text-[#111812] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                  Today
                </span>
              )}
            </h3>

            {/* Meal card or empty day placeholder */}
            {entry.meal ? (
              <MealCard
                layout="row"
                mealName={entry.meal.mealName}
                mealType={entry.meal.mealType}
                estimatedCost={entry.meal.estimatedCost}
                imageUrl={entry.meal.imageUrl}
                imageAlt={entry.meal.imageAlt}
                isToday={entry.isToday}
                onViewRecipe={() => {}}
              />
            ) : (
              /* Empty day — "Add a meal" placeholder */
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-[#618968]/20 rounded-xl bg-white/30 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => navigate("/new-plan")}
                  className="flex flex-col items-center gap-2"
                  aria-label="Add a meal for this day"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                  <span className="text-sm font-bold text-[#618968]">Add a meal</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </main>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-3 bg-white/95 dark:bg-background-dark/95 border-t border-[#618968]/10">
        <div className="flex gap-3">
          {/* Edit current plan */}
          <Button
            variant="outline"
            size="md"
            className="flex-1"
            onClick={() => navigate("/new-plan")}
          >
            Edit Plan
          </Button>

          {/* Generate grocery list from this plan */}
          <Button
            variant="primary"
            size="md"
            icon="shopping_cart"
            className="flex-[2]"
            onClick={() => navigate("/grocery")}
          >
            Generate Grocery List
          </Button>
        </div>
      </div>

      {/* ── Fixed bottom navigation ── */}
      <BottomNavBar />
    </div>
  );
}