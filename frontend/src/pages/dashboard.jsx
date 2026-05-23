/**
 * @file Dashboard.jsx
 * @description Home/Dashboard screen for the PlanMe app.
 *              Shows today's meal, quick action buttons, weekly budget
 *              summary, and tomorrow's menu preview.
 *              Matches the dashboard.html design exactly.
 * @module pages
 */

import { useNavigate } from "react-router-dom";
import BudgetBar from "../components/ui/BudgetBar";
import MealCard from "../components/ui/MealCard";
import MealThumbnail from "../components/ui/MealThumbnail";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Hardcoded data for UI development — will be replaced with API calls in Phase 4.

/**
 * Today's featured meal shown at the top of the Dashboard.
 */
const TODAY_MEAL = {
  mealName: "Poulet DG",
  mealType: "Dinner",
  estimatedCost: 6000,
  prepTime: 45,
  servings: 4,
  description:
    "A celebrated Cameroonian dish of sautéed chicken and fried plantains in a savory tomato sauce.",
  imageUrl:
    "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600",
  imageAlt: "Poulet DG with fried plantains",
};

/**
 * Tomorrow's meal preview thumbnails shown in the horizontal scroll section.
 */
const TOMORROW_MEALS = [
  {
    id: 1,
    mealName: "Ndolé with Miondo",
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200",
    imageAlt: "A serving of Cameroonian Ndolé",
  },
  {
    id: 2,
    mealName: "Achu & Yellow Soup",
    imageUrl:
      "https://images.unsplash.com/photo-1547592180-85f173990554?w=200",
    imageAlt: "Achu soup bowl",
  },
  {
    id: 3,
    mealName: "Grilled Tilapia",
    imageUrl:
      "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200",
    imageAlt: "Grilled fish with pepper sauce",
  },
];

/**
 * Weekly budget data for the BudgetBar card.
 */
const BUDGET = {
  spent: 30000,
  total: 45000,
  weekLabel: "Week 24",
  tip: "You've saved 2,500 FCFA compared to last week!",
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * Dashboard page component.
 *
 * The main home screen after login. Shows:
 * - Greeting header with user name and notification bell
 * - Today's featured meal card
 * - Quick action buttons (New Plan, Groceries, AI Suggest)
 * - Weekly budget progress bar
 * - Tomorrow's menu horizontal scroll
 * - Fixed bottom navigation bar
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">

      {/* ── Sticky top header ── */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">

          {/* User greeting + avatar */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-primary/20 flex items-center justify-center shrink-0">
              {/* TODO: replace with real user avatar from API */}
              <span className="material-symbols-outlined text-primary">person</span>
            </div>
            <div>
              <h2 className="text-[#111812] dark:text-white text-lg font-bold leading-tight">
                {/* TODO: replace "Mbah" with real username from auth context */}
                Hello, Mbah!
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
            className="flex w-10 h-10 items-center justify-center rounded-full bg-white dark:bg-[#1a2e1d] shadow-sm"
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
          <MealCard
            layout="featured"
            mealName={TODAY_MEAL.mealName}
            mealType={TODAY_MEAL.mealType}
            estimatedCost={TODAY_MEAL.estimatedCost}
            prepTime={TODAY_MEAL.prepTime}
            servings={TODAY_MEAL.servings}
            description={TODAY_MEAL.description}
            imageUrl={TODAY_MEAL.imageUrl}
            imageAlt={TODAY_MEAL.imageAlt}
            onViewRecipe={() => navigate("/week-plan")}
          />
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

            {/* AI Suggest — navigates to new plan with AI focus */}
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
          <BudgetBar
            spent={BUDGET.spent}
            total={BUDGET.total}
            weekLabel={BUDGET.weekLabel}
            tip={BUDGET.tip}
          />
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
              className="text-sm font-bold text-[#618968] dark:text-primary"
            >
              See All
            </button>
          </div>

          {/* Horizontal scroll row — no scrollbar shown */}
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ scrollbarWidth: "none" }}
          >
            {TOMORROW_MEALS.map((meal) => (
              <MealThumbnail
                key={meal.id}
                mealName={meal.mealName}
                imageUrl={meal.imageUrl}
                imageAlt={meal.imageAlt}
                onPress={() => navigate("/week-plan")}
              />
            ))}
          </div>
        </section>
      </main>

      {/* ── Fixed bottom navigation ── */}
      <BottomNavBar />
    </div>
  );
}