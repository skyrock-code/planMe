/**
 * @file Dashboard.jsx
 * @description Home/Dashboard screen for the PlanMe app.
 *              Shows today's meal, quick action buttons, weekly budget
 *              summary, and tomorrow's menu preview.
 *              Connected to real Flask backend API for all data.
 * @module pages
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import planService from "../services/planService";
import { PageWrapper, ErrorMessage } from "../components/common";
import BudgetBar from "../components/ui/BudgetBar";
import MealCard from "../components/ui/MealCard";
import MealThumbnail from "../components/ui/MealThumbnail";
import BottomNavBar from "../components/layout/BottomNavBar";
import { getMealImage } from "../utils/mealImages";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * Dashboard page component.
 *
 * The main home screen after login. Fetches real data from backend:
 * - User's meal plans
 * - Meals assigned to the active plan
 * - Today's meal (based on date logic)
 * - Tomorrow's meals (based on date logic)
 * - Active plan budget info
 *
 * Shows loading spinner during fetch, error message on failure,
 * and empty states when user has no plans or no meals for today/tomorrow.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── State ──
  const [plans, setPlans] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Fetch Dashboard Data ──
  /**
   * Fetches all data needed for the Dashboard.
   * Called on mount and when user manually retries.
   * Uses useCallback so it can be passed to PageWrapper onRetry.
   */
  const fetchDashboard = useCallback(async () => {
    // Guard: user must be logged in
    if (!user?.user_id) return;

    try {
      setLoading(true);
      setError("");

      // Step 1: Fetch all plans for this user
      const userPlans = await planService.getUserPlans(user.user_id);
      setPlans(userPlans);

      // Step 2: If user has plans, fetch meals for the most recent one
      if (userPlans.length > 0) {
        const activePlan = userPlans.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];

        const planData = await planService.getPlanMeals(activePlan.plan_id);
        // getPlanMeals returns { plan_id, cooking_frequency, meals: [] }
        setMeals(planData.meals || []);
      }
    } catch (err) {
      // Extract readable error message from API or use fallback
      const message =
        err.response?.data?.error ||
        "Failed to load dashboard. Please check your connection.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  // ── Effects ──
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Derived Data ──
  // Most recent plan (or null if no plans)
  const activePlan =
    plans.length > 0
      ? plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : null;

  // Today's date as YYYY-MM-DD string
  const today = new Date().toISOString().split("T")[0];

  // Tomorrow's date as YYYY-MM-DD string
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split("T")[0];

  // Meal active today (may be null)
  const todaysMeal =
    meals.find((m) => m.start_date <= today && today <= m.ends_on) || null;

  // Meals active tomorrow (may be empty array)
  const tomorrowMeals = meals.filter(
    (m) => m.start_date <= tomorrow && tomorrow <= m.ends_on
  );

  // Budget spent = 0 for now (will be replaced with real grocery total)
  // TODO: replace with real grocery total when GroceryList is connected
  const budgetSpent = 0;

  // ── Render ──
  return (
    <PageWrapper
      loading={loading}
      error={error}
      onRetry={fetchDashboard}
      loadingMsg="Loading your dashboard..."
    >
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">

        {/* ── Sticky top header ── */}
        <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4">
          <div className="flex items-center justify-between max-w-md mx-auto">

            {/* User greeting + avatar */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-primary/20 flex items-center justify-center shrink-0 hover:bg-primary/30 transition-colors"
                aria-label="Go to profile"
              >
                <span className="material-symbols-outlined text-primary">
                  person
                </span>
              </button>
              <div>
                <h2 className="text-[#111812] dark:text-white text-lg font-bold leading-tight">
                  Hello, {user?.username || "User"}!
                </h2>
                <p className="text-sm text-[#618968] dark:text-primary/70">
                  Ready to plan your day?
                </p>
              </div>
            </div>

            {/* Notification bell */}
            <button
              type="button"
              aria-label="Notifications"
              className="flex w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-[#1a2e1d] shadow-sm hover:bg-gray-100 dark:hover:bg-[#1f3a23] transition-colors"
            >
              <span className="material-symbols-outlined text-[#111812] dark:text-white">
                notifications
              </span>
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="max-w-md mx-auto">

          {/* ── Today's Meal section ── */}
          <section className="p-4">
            <h3 className="text-[#111812] dark:text-white text-lg font-bold mb-3 px-1">
              Today's Meal
            </h3>
            {todaysMeal ? (
              <MealCard
                layout="featured"
                mealName={todaysMeal.meal_name}
                mealType="Cooking Session"
                imageUrl={getMealImage(todaysMeal?.meal_name)}
                onViewRecipe={() => navigate("/week-plan")}
              />
            ) : (
              <ErrorMessage
                type="empty"
                message="No meal planned for today. Generate a new plan!"
                icon="restaurant_menu"
              />
            )}
          </section>

          {/* ── Quick Actions section ── */}
          <section className="p-4">
            <h3 className="text-[#111812] dark:text-white text-lg font-bold mb-3 px-1">
              Quick Actions
            </h3>
            <div className="flex gap-3">

              {/* New Plan */}
              <button
                type="button"
                onClick={() => navigate("/new-plan")}
                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-primary/20 dark:bg-primary/10 border border-primary/20 hover:bg-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#111812]">
                    add_circle
                  </span>
                </div>
                <span className="text-sm font-bold text-[#111812] dark:text-white">
                  New Plan
                </span>
              </button>

              {/* Groceries */}
              <button
                type="button"
                onClick={() => navigate("/grocery")}
                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-primary/20 dark:bg-primary/10 border border-primary/20 hover:bg-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#111812]">
                    shopping_cart
                  </span>
                </div>
                <span className="text-sm font-bold text-[#111812] dark:text-white">
                  Groceries
                </span>
              </button>

              {/* AI Suggest */}
              <button
                type="button"
                onClick={() => navigate("/new-plan")}
                className="flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-primary/20 dark:bg-primary/10 border border-primary/20 hover:bg-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#111812]">
                    auto_awesome
                  </span>
                </div>
                <span className="text-sm font-bold text-[#111812] dark:text-white">
                  AI Suggest
                </span>
              </button>
            </div>
          </section>

          {/* ── Weekly Budget section ── */}
          <section className="p-4">
            {activePlan ? (
              <BudgetBar
                spent={budgetSpent}
                total={activePlan.total_budget}
                weekLabel={`Plan #${activePlan.plan_id}`}
                tip="Budget calculated from your active meal plan."
              />
            ) : (
              <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5">
                <p className="text-[#618968] text-sm">
                  No active plan. Create one to track your budget.
                </p>
              </div>
            )}
          </section>

          {/* ── Tomorrow's Menu section ── */}
          <section className="p-4">
            <div className="flex justify-between items-center mb-3 px-1">
              <h3 className="text-[#111812] dark:text-white text-lg font-bold">
                Tomorrow's Menu
              </h3>
              <button
                type="button"
                onClick={() => navigate("/week-plan")}
                className="text-sm font-bold text-[#618968] dark:text-primary hover:underline"
              >
                See All
              </button>
            </div>

            {/* Horizontal scroll row — no scrollbar shown */}
            {tomorrowMeals.length > 0 ? (
              <div
                className="flex gap-4 overflow-x-auto pb-4"
                style={{ scrollbarWidth: "none" }}
              >
                {tomorrowMeals.map((meal) => (
                  <MealThumbnail
                    key={meal.meal_id}
                    mealName={meal.meal_name}
                    imageUrl={getMealImage(meal.meal_name)}
                    onPress={() => navigate("/week-plan")}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[#618968] text-sm px-1">
                Nothing planned for tomorrow yet.
              </p>
            )}
          </section>
        </main>

        {/* ── Fixed bottom navigation ── */}
        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}