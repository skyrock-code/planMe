/**
 * @file WeekPlan.jsx
 * @description Weekly Meal Plan screen for the PlanMe app.
 *              Shows a 7-day calendar strip with real dates from the plan,
 *              displays assigned meals, and supports swapping meals.
 *              Connected to real Flask backend for all data.
 * @module pages
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import planService from "../services/planService";
import mealService from "../services/mealService";
import { PageWrapper } from "../components/common";
import TopAppBar from "../components/layout/TopAppBar";
import MealCard from "../components/ui/MealCard";
import Button from "../components/ui/Button";
import BottomNavBar from "../components/layout/BottomNavBar";
import { getMealImage } from "../utils/mealImages";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * WeekPlan page component.
 *
 * Shows the generated weekly meal plan with:
 * - A 7-day calendar strip with real dates
 * - Assigned meals for each day
 * - Ability to swap meals with other options
 * - Full calendar view of the plan period
 *
 * Can be accessed via:
 * - /week-plan/:planId — load specific plan by ID
 * - /week-plan — load most recent plan for logged-in user
 *
 * @component
 * @returns {JSX.Element}
 */
export default function WeekPlan() {
  const navigate = useNavigate();
  const { planId: urlPlanId } = useParams();
  const { user } = useAuth();

  // ── State ──
  const [plan, setPlan] = useState(null);
  const [meals, setMeals] = useState([]);
  const [allMeals, setAllMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);

  // Swap modal state
  const [swapModal, setSwapModal] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  const [swapping, setSwapping] = useState(false);

  // Assign modal state — tracks which empty day is being filled
  // Shape: { dateStr: "YYYY-MM-DD" } or null
  const [assignTarget, setAssignTarget] = useState(null);

  // ── Data Fetching ──
  const fetchPlanData = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      setError("");

      let targetPlanId = urlPlanId;

      // If no planId in URL, fetch user's most recent plan
      if (!targetPlanId) {
        const userPlans = await planService.getUserPlans(user.user_id);
        if (userPlans.length === 0) {
          // No plans exist — redirect to NewPlan
          navigate("/new-plan");
          return;
        }
        const mostRecent = userPlans.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];
        targetPlanId = mostRecent.plan_id;
      }

      // Fetch plan meals and all available meals in parallel
      const [planData, allMealsData] = await Promise.all([
        planService.getPlanMeals(targetPlanId),
        mealService.getAllMeals(),
      ]);

      setPlan({ plan_id: targetPlanId, ...planData });
      setMeals(planData.meals || []);
      setAllMeals(allMealsData);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load meal plan. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [urlPlanId, user?.user_id, navigate]);

  useEffect(() => {
    fetchPlanData();
  }, [fetchPlanData]);

  // ── Week Days Generation ──
  /**
   * Generates an array of 7 day objects for the calendar strip.
   * Uses the plan's start_date if available.
   */
  function getWeekDays(startDateStr) {
    const start = startDateStr ? new Date(startDateStr) : new Date();

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return {
        short: date.toLocaleDateString("en", { weekday: "short" }),
        dayLabel: date.toLocaleDateString("en", {
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        dateStr: date.toISOString().split("T")[0], // YYYY-MM-DD
        dateNum: date.getDate(),
      };
    });
  }

  // Inside component body (before return):
  const weekDays = plan ? getWeekDays(plan.start_date) : [];

  /**
   * Finds the meal assigned to a specific date.
   * @param {string} dateStr - YYYY-MM-DD format
   * @returns {Object|null} Meal assignment or null if no meal
   */
  function getMealForDay(dateStr) {
    return (
      meals.find((m) => m.start_date <= dateStr && dateStr <= m.ends_on) || null
    );
  }

  // ── Swap Meal Feature ──
  /**
   * Opens the swap modal targeting a specific meal assignment.
   * @param {Object} meal - The meal assignment to swap
   */
  function openSwapModal(meal) {
    setSwapTarget(meal);
    setAssignTarget(null); // clear assign target — mutually exclusive
    setSwapModal(true);
  }

  /**
   * Opens the meal selection modal for an EMPTY day.
   * The selected meal will be assigned to this date
   * via POST /api/meal_plan/assign.
   *
   * @param {string} dateStr - YYYY-MM-DD of the empty day
   */
  function openAssignModal(dateStr) {
    setAssignTarget({ dateStr });
    setSwapTarget(null); // clear swap target — mutually exclusive
    setSwapModal(true);  // reuse same modal UI
  }

  /**
   * Unified meal selection handler for the modal.
   *
   * Two cases:
   * 1. assignTarget is set → assign meal to an empty day
   *    calls POST /api/meal_plan/assign
   * 2. swapTarget is set  → swap existing meal for a new one
   *    calls PUT /api/meal_plan/swap
   *
   * After either action, refreshes the plan and closes the modal.
   *
   * @param {number} newMealId - The selected meal's ID
   */
  async function handleMealSelection(newMealId) {
    if (!plan) return;
    try {
      setSwapping(true);

      if (assignTarget) {
        // ── Assigning meal to an empty day ──────────────────────
        await planService.assignMeal({
          plan_id:       plan.plan_id,
          meal_id:       newMealId,
          start_date:    assignTarget.dateStr,
          duration_days: 1,
        });
        setAssignTarget(null);

      } else if (swapTarget) {
        // ── Swapping existing meal for a new one ─────────────────
        await planService.swapMeal({
          plan_id:     plan.plan_id,
          old_meal_id: swapTarget.meal_id,
          new_meal_id: newMealId,
          start_date:  swapTarget.start_date,
        });
        setSwapTarget(null);
      }

      // Refresh plan data to show updated meal assignments
      await fetchPlanData();
      setSwapModal(false);

    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Failed to update meal. Please try again."
      );
    } finally {
      setSwapping(false);
    }
  }

  // ── Render ──
  return (
    <PageWrapper
      loading={loading}
      error={error}
      onRetry={fetchPlanData}
      loadingMsg="Loading your meal plan..."
    >
      <div className="min-h-screen bg-background-light dark:bg-background-dark">

        {/* ── Sticky top bar with date range ── */}
        <TopAppBar
          title="Weekly Meal Plan"
          subtitle={
            plan && weekDays.length > 0
              ? `${weekDays[0].dayLabel} - ${weekDays[6].dayLabel}`
              : "Loading..."
          }
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
            {weekDays.map((day, index) => {
              const isActive = index === selectedDay;
              const dayMeal = getMealForDay(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDay(index)}
                  aria-label={`${day.short} ${day.dateNum}`}
                  aria-pressed={isActive}
                  className={[
                    "flex flex-col items-center justify-center min-w-[50px] h-20 rounded-full transition-all",
                    isActive
                      ? "bg-primary text-white shadow-lg"
                      : "bg-white dark:bg-white/5 border border-[#618968]/20 text-[#111812] dark:text-white",
                  ].join(" ")}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? "text-white" : "text-[#618968]"
                    }`}
                  >
                    {day.short}
                  </span>
                  <span className="text-xl font-extrabold">{day.dateNum}</span>

                  {/* Dot indicator for days that have a meal */}
                  {dayMeal && (
                    <div
                      className={`w-1 h-1 rounded-full mt-1 ${
                        isActive ? "bg-white" : "bg-primary"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Meal plan feed ── */}
        <main className="flex flex-col gap-2 px-4 pb-40">
          {weekDays.map((day, index) => {
            const dayMeal = getMealForDay(day.dateStr);
            const isToday = index === 0; // First day of plan is "today"

            return (
              <div key={day.dateStr}>
                {/* Day label + "Today" badge */}
                <h3 className="text-[#111812] dark:text-white text-base font-bold py-3 flex items-center gap-2">
                  {day.dayLabel}
                  {isToday && (
                    <span className="text-[10px] bg-primary/20 text-[#111812] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                      Today
                    </span>
                  )}
                </h3>

                {/* Meal card or empty day placeholder */}
                {dayMeal ? (
                  <>
                    <MealCard
                      layout="row"
                      mealName={dayMeal.meal_name}
                      mealType={`${day.short} Cooking Session`}
                      imageUrl={getMealImage(dayMeal?.meal_name)}
                      isToday={isToday}
                      onViewRecipe={() => {}}
                    />
                    {/* Swap and View buttons */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="swap_horiz"
                        onClick={() => openSwapModal(dayMeal)}
                      >
                        Swap
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="visibility"
                        onClick={() => {}}
                      >
                        View
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Empty day — click opens meal selection modal */
                  <div className="flex items-center justify-center p-8 border-2 border-dashed border-[#618968]/20 rounded-xl bg-white/30 dark:bg-white/5">
                    <button
                      type="button"
                      onClick={() => openAssignModal(day.dateStr)}
                      className="flex flex-col items-center gap-2"
                      aria-label={`Add a meal for ${day.dayLabel}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">
                          add
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#618968]">
                        Add a meal
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
              onClick={() => navigate(`/grocery/${plan.plan_id}`)}
            >
              Generate Grocery List
            </Button>
          </div>
        </div>

        {/* ── Meal Swap Modal ── */}
        {swapModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
            <div className="w-full max-w-[430px] mx-auto bg-white dark:bg-background-dark rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
              {/* Modal header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-[#111812] dark:text-white">
                  {assignTarget ? "Choose a Meal to Add" : "Choose a Replacement Meal"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSwapModal(false);
                    setAssignTarget(null);
                    setSwapTarget(null);
                  }}
                  className="text-[#618968] hover:text-primary"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Meal list */}
              <div className="flex flex-col gap-2">
                {allMeals.map((meal) => (
                  <button
                    key={meal.meal_id}
                    type="button"
                    disabled={swapping}
                    onClick={() => handleMealSelection(meal.meal_id)}
                    className="flex items-center justify-between p-4 rounded-xl bg-background-light dark:bg-white/5 hover:bg-primary/10 transition-colors text-left border border-transparent hover:border-primary/20 disabled:opacity-50"
                  >
                    <span className="font-semibold text-[#111812] dark:text-white text-sm">
                      {meal.meal_name}
                    </span>
                    <span className="material-symbols-outlined text-primary text-base">
                      {assignTarget ? "add_circle" : "swap_horiz"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Fixed bottom navigation ── */}
        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}