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
import { getMealDescription } from "../utils/mealDescriptions";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * WeekPlan page component.
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

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState(null);

  // ── Data Fetching ──
  const fetchPlanData = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      setError("");

      let targetPlanId = urlPlanId;

      if (!targetPlanId) {
        const userPlans = await planService.getUserPlans(user.user_id);
        if (userPlans.length === 0) {
          navigate("/new-plan");
          return;
        }
        const mostRecent = userPlans.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];
        targetPlanId = mostRecent.plan_id;
      }

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
        dateStr: date.toISOString().split("T")[0],
        dateNum: date.getDate(),
      };
    });
  }

  const weekDays = plan ? getWeekDays(plan.start_date) : [];

  function getMealForDay(dateStr) {
    return (
      meals.find((m) => m.start_date <= dateStr && dateStr <= m.ends_on) || null
    );
  }

  // ── Modal Handlers ──
  function openSwapModal(meal) {
    setSwapTarget(meal);
    setAssignTarget(null);
    setSwapModal(true);
  }

  function openAssignModal(dateStr) {
    setAssignTarget({ dateStr });
    setSwapTarget(null);
    setSwapModal(true);
  }

  async function handleMealSelection(newMealId) {
    if (!plan) return;
    try {
      setSwapping(true);

      if (assignTarget) {
        await planService.assignMeal({
          plan_id: plan.plan_id,
          meal_id: newMealId,
          start_date: assignTarget.dateStr,
          duration_days: 1,
        });
        setAssignTarget(null);
      } else if (swapTarget) {
        await planService.swapMeal({
          plan_id: plan.plan_id,
          old_meal_id: swapTarget.meal_id,
          new_meal_id: newMealId,
          start_date: swapTarget.start_date,
        });
        setSwapTarget(null);
      }

      await fetchPlanData();
      setSwapModal(false);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to update meal. Please try again."
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
      <div className="relative min-h-screen bg-background-light dark:bg-background-dark">

        {/* Food background decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <svg className="absolute -top-8 -right-8 w-64 h-64 opacity-[0.15]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="120" cy="80" rx="40" ry="70" stroke="currentColor" strokeWidth="6" style={{ color: '#2d5a27' }} transform="rotate(-20 120 80)" />
            <path d="M120 10 Q130 0 145 5 Q135 15 120 10Z" fill="currentColor" style={{ color: '#2d5a27' }} />
          </svg>
          <svg className="absolute bottom-32 -left-6 w-52 h-52 opacity-[0.12]" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 130 Q10 80 40 50 Q70 20 100 40 Q80 70 60 90 Q40 110 20 130Z" stroke="currentColor" strokeWidth="5" fill="none" style={{ color: '#2d5a27' }} />
            <path d="M40 120 Q30 70 60 45 Q90 20 115 38" stroke="currentColor" strokeWidth="4" fill="none" style={{ color: '#2d5a27' }} />
          </svg>
          <svg className="absolute top-1/2 -right-4 w-40 h-40 opacity-[0.12]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="55" r="35" stroke="currentColor" strokeWidth="5" style={{ color: '#2d5a27' }} />
            <path d="M50 20 Q55 10 65 12 Q58 22 50 20Z" fill="currentColor" style={{ color: '#2d5a27' }} />
            <path d="M50 20 Q45 8 35 10 Q42 20 50 20Z" fill="currentColor" style={{ color: '#2d5a27' }} />
          </svg>
        </div>

        {/* Top bar */}
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

        {/* Calendar strip */}
        <div className="px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
            {weekDays.map((day, index) => {
              const isActive = index === selectedDay;
              const dayMeal = getMealForDay(day.dateStr);
              return (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => setSelectedDay(index)}
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
                  <span className="text-xl font-extrabold">{day.dateNum}</span>
                  {dayMeal && (
                    <div className={`w-1 h-1 rounded-full mt-1 ${isActive ? "bg-white" : "bg-primary"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meal plan feed */}
        <main className="flex flex-col gap-2 px-4 pb-40">
          {weekDays.map((day, index) => {
            const dayMeal = getMealForDay(day.dateStr);
            const isToday = index === 0;

            return (
              <div key={day.dateStr}>
                {/* Day label */}
                <h3 className="text-[#111812] dark:text-white text-base font-bold py-3 flex items-center gap-2">
                  {day.dayLabel}
                  {isToday && (
                    <span className="text-[10px] bg-primary/20 text-[#111812] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                      Today
                    </span>
                  )}
                </h3>

                {dayMeal ? (
                  <>
                    {/* Meal Card - description passed as prop (inside the card) */}
                    <MealCard
                      layout="row"
                      mealName={dayMeal.meal_name}
                      mealType={`${day.short} Cooking Session`}
                      mealId={dayMeal.meal_id}
                      description={getMealDescription(dayMeal.meal_id)}
                      isToday={isToday}
                    />
                    
                    {/* Swap button only */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon="swap_horiz"
                        onClick={() => openSwapModal(dayMeal)}
                      >
                        Swap
                      </Button>
                    </div>
                  </>
                ) : (
                  /* Empty day placeholder */
                  <div className="flex items-center justify-center p-8 border-2 border-dashed border-[#618968]/20 rounded-xl bg-white/30 dark:bg-white/5">
                    <button
                      type="button"
                      onClick={() => openAssignModal(day.dateStr)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary">add</span>
                      </div>
                      <span className="text-sm font-bold text-[#618968]">Add a meal</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </main>

        {/* Bottom action bar */}
        <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-3 bg-white/95 dark:bg-background-dark/95 border-t border-[#618968]/10">
          <div className="flex gap-3">
            <Button variant="outline" size="md" className="flex-1" onClick={() => navigate("/new-plan")}>
              Edit Plan
            </Button>
            <Button
              variant="primary"
              size="md"
              icon="shopping_cart"
              className="flex-[2]"
              onClick={() => plan && navigate(`/grocery/${plan.plan_id}`)}
            >
              Generate Grocery List
            </Button>
          </div>
        </div>

        {/* Modal */}
        {swapModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="w-full max-w-[430px] mx-4 bg-white dark:bg-background-dark rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
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

              <div className="flex flex-col gap-2">
                {allMeals.length === 0 ? (
                  <div className="text-center py-8 text-[#618968]">
                    <span className="material-symbols-outlined text-4xl mb-2">restaurant_menu</span>
                    <p>No meals available</p>
                  </div>
                ) : (
                  allMeals.map((meal) => (
                    <button
                      key={meal.meal_id}
                      type="button"
                      disabled={swapping}
                      onClick={() => handleMealSelection(meal.meal_id)}
                      className="flex items-center justify-between p-4 rounded-xl bg-background-light dark:bg-white/5 hover:bg-primary/10 transition-all text-left border border-transparent hover:border-primary/20 disabled:opacity-50"
                    >
                      <div>
                        <span className="font-semibold text-[#111812] dark:text-white text-sm">
                          {meal.meal_name}
                        </span>
                        <p className="text-xs text-[#618968] mt-0.5">
                          {meal.cuisine_type || "Traditional"} · {meal.servings} servings
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-primary text-base">
                        {assignTarget ? "add_circle" : "swap_horiz"}
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="mt-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setSwapModal(false);
                    setAssignTarget(null);
                    setSwapTarget(null);
                  }}
                  className="w-full py-3 text-center text-[#618968] font-medium hover:text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}