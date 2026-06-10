import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import planService from "../services/planService";
import groceryService from "../services/groceryService";
import { PageWrapper } from "../components/common";
import BottomNavBar from "../components/layout/BottomNavBar";
import { getMealImage } from "../utils/mealImages";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatFCFA(amount) {
  return `${(amount ?? 0).toLocaleString("fr-CM")} XAF`;
}

function formatDateRange(start, end) {
  const parse = (s) => { const [y, m, d] = s.split("-"); return new Date(y, m - 1, d); };
  const opts = { month: "short", day: "numeric" };
  return `${parse(start).toLocaleDateString("en", opts)} – ${parse(end).toLocaleDateString("en", opts)}`;
}

function getWeekDays(startDateStr) {
  if (!startDateStr) return [];
  const [y, m, d] = startDateStr.split("-");
  const start = new Date(y, m - 1, d);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      short:   date.toLocaleDateString("en", { weekday: "short" }),
      dateNum: date.getDate(),
      dateStr: date.toISOString().split("T")[0],
    };
  });
}

// ─── FOOD BACKGROUND DECORATION ───────────────────────────────────────────────

function FoodBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">

      {/* Top right — pepper */}
      <div className="absolute -top-8 -right-8 w-64 h-64 opacity-20">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="120" cy="80" rx="40" ry="70" stroke="#2d5a27" strokeWidth="4" fill="none" transform="rotate(-20 120 80)" />
          <path d="M120 10 C125 0,140 -2,145 5 C140 12,130 15,120 10Z" fill="#2d5a27" />
          <path d="M80 50 C60 40,50 60,55 80" stroke="#2d5a27" strokeWidth="3" fill="none" />
        </svg>
      </div>

      {/* Bottom left — plantain bunch */}
      <div className="absolute bottom-20 -left-10 w-52 h-52 opacity-15">
        <svg viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M30 130 C20 80,40 50,70 30 C100 10,120 30,110 60 C90 80,70 100,50 120 C40 125,35 128,30 130Z" stroke="#2d5a27" strokeWidth="5" fill="none" />
          <path d="M50 120 C40 70,60 45,85 30" stroke="#2d5a27" strokeWidth="4" fill="none" />
          <path d="M70 110 C60 60,80 40,105 25" stroke="#2d5a27" strokeWidth="3" fill="none" />
        </svg>
      </div>

      {/* Center right — tomato */}
      <div className="absolute top-1/3 -right-6 w-40 h-40 opacity-[0.12]">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="55" r="35" stroke="#2d5a27" strokeWidth="5" fill="none" />
          <path d="M50 20 C55 10,65 8,70 15 C65 22,58 25,50 20Z" fill="#2d5a27" />
          <path d="M45 22 C40 12,30 10,25 17 C30 24,38 27,45 22Z" fill="#2d5a27" />
          <path d="M35 55 C30 45,20 50,25 60" stroke="#2d5a27" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Bottom right — okra cross-section */}
      <div className="absolute bottom-20 -right-4 w-32 h-32 opacity-10">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="30" stroke="#2d5a27" strokeWidth="4" fill="none" />
          <circle cx="50" cy="50" r="10" stroke="#2d5a27" strokeWidth="2" fill="none" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="#2d5a27" strokeWidth="2" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="#2d5a27" strokeWidth="2" />
        </svg>
      </div>

    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── State ──
  const [plans, setPlans]             = useState([]);
  const [meals, setMeals]             = useState([]);
  const [groceryTotal, setGroceryTotal] = useState(0);
  const [groceryTotals, setGroceryTotals] = useState({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // ── Fetch ──
  const fetchDashboard = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      setError("");

      const userPlans = await planService.getUserPlans(user.user_id);
      setPlans(userPlans);

      if (userPlans.length > 0) {
        const active = userPlans.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];

        const planData = await planService.getPlanMeals(active.plan_id);
        setMeals(planData.meals || []);

        // Grocery total for active plan summary card
        try {
          const gd = await groceryService.fetchList(active.plan_id);
          setGroceryTotal(gd.total_price || 0);
        } catch {
          setGroceryTotal(0);
        }

        // Grocery totals for last 3 plans (plan history badges)
        const recent3 = userPlans
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 3);
        const totals = {};
        await Promise.all(
          recent3.map(async (p) => {
            try {
              const gd = await groceryService.fetchList(p.plan_id);
              totals[p.plan_id] = gd.total_price || 0;
            } catch {
              totals[p.plan_id] = null;
            }
          })
        );
        setGroceryTotals(totals);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load dashboard. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Derived ──
  const activePlan =
    plans.length > 0
      ? plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : null;

  const today    = new Date().toISOString().split("T")[0];
  const weekDays = activePlan ? getWeekDays(activePlan.start_date) : [];

  function getMealForDay(dateStr) {
    return meals.find((m) => m.start_date <= dateStr && dateStr <= m.ends_on) || null;
  }

  const recentPlans = plans
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // ── Render ──
  return (
    <PageWrapper
      loading={loading}
      error={error}
      onRetry={fetchDashboard}
      loadingMsg="Loading your dashboard..."
    >
      <div className="relative min-h-screen bg-background-light dark:bg-background-dark pb-24">

        <FoodBackground />

        {/* ── Header ── */}
        <header className="flex items-center justify-between px-4 pt-4 pb-2 max-w-md mx-auto">
          {/* Hamburger (visual only) */}
          <button
            type="button"
            aria-label="Menu"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[#111812] dark:text-white">menu</span>
          </button>

          {/* Brand */}
          <span className="text-xl font-extrabold tracking-tight text-primary">
            PlanMe
          </span>

          {/* Bell + avatar */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[#111812] dark:text-white text-[22px]">
                notifications
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              aria-label="Go to profile"
              className="w-9 h-9 rounded-full border-2 border-primary bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">person</span>
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto">

          {/* ── Hero ── */}
          <section className="px-4 pt-3 pb-5">
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent px-5 pt-5 pb-6">
              <p className="text-[#618968] dark:text-primary/80 text-sm font-medium">
                Welcome back,
              </p>
              <h1 className="text-4xl font-extrabold text-[#111812] dark:text-white leading-tight mt-0.5 capitalize">
                {user?.username || "Friend"}
              </h1>
              <p className="text-[#618968] dark:text-primary/70 text-sm mt-2">
                Smart planning for healthy living.
              </p>
            </div>
          </section>

          {/* ── Summary Card ── */}
          <section className="px-4 mb-4">
            <div className="bg-[#2d5a27] rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-4">
                Your Summary
              </p>
              <div className="grid grid-cols-2 gap-4">

                {/* Budget */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">
                      {activePlan ? formatFCFA(activePlan.total_budget) : "—"}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">Budget</p>
                  </div>
                </div>

                {/* Household */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">
                      {user?.household_size != null ? `${user.household_size} People` : "—"}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">Household</p>
                  </div>
                </div>

                {/* Active Plan */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">
                      {activePlan
                        ? formatDateRange(activePlan.start_date, activePlan.end_date)
                        : "No active plan"}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">Active Plan</p>
                  </div>
                </div>

                {/* Est. Grocery Cost */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[18px]">shopping_bag</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm leading-tight">
                      {activePlan ? formatFCFA(groceryTotal) : "—"}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">Est. Grocery Cost</p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ── No Plan CTA ── */}
          {!activePlan && (
            <section className="px-4 mb-4">
              <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-50 dark:border-gray-800">
                <div>
                  <p className="font-bold text-[#111812] dark:text-white text-sm">
                    No plan for this week?
                  </p>
                  <p className="text-xs text-[#618968] mt-0.5">
                    Generate your personalised meal plan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/new-plan")}
                  className="shrink-0 flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-3 py-2 rounded-full hover:bg-primary-light transition-colors"
                >
                  <span className="text-[10px]">✦</span>
                  Generate Plan
                </button>
              </div>
            </section>
          )}

          {/* ── This Week at a Glance ── */}
          {weekDays.length > 0 && (() => {
            const glanceDays = weekDays
              .filter((day) => getMealForDay(day.dateStr) !== null)
              .slice(0, 3);

            if (glanceDays.length === 0) return null;

            return (
              <section className="px-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#111812] dark:text-white text-base font-bold">
                    This Week at a Glance
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      activePlan
                        ? navigate(`/week-plan/${activePlan.plan_id}`)
                        : navigate("/week-plan")
                    }
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View full plan →
                  </button>
                </div>

                <div
                  className="flex gap-3 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: "none" }}
                >
                  {glanceDays.map((day) => {
                    const isToday  = day.dateStr === today;
                    const dayMeal  = getMealForDay(day.dateStr);
                    const mealImage = dayMeal ? getMealImage(dayMeal.meal_name) : null;
                    const mealWords = dayMeal
                      ? dayMeal.meal_name.split(" ").slice(0, 2).join(" ")
                      : null;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() =>
                          activePlan
                            ? navigate(`/week-plan/${activePlan.plan_id}`)
                            : navigate("/week-plan")
                        }
                        className="flex-shrink-0 w-32 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden text-left transition-all hover:shadow-md"
                      >
                        {/* Date header */}
                        <div className={`px-3 py-2 text-center ${isToday ? "bg-[#2d5a27]" : "bg-gray-50 dark:bg-white/5"}`}>
                          <div className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-white/70" : "text-[#618968]"}`}>
                            {day.short}
                          </div>
                          <div className={`text-lg font-extrabold leading-tight ${isToday ? "text-white" : "text-[#111812] dark:text-white"}`}>
                            {day.dateNum}
                          </div>
                        </div>

                        {/* Meal content */}
                        <div className="p-3 flex flex-col items-center gap-2">
                          {mealImage ? (
                            <img
                              src={mealImage}
                              alt={dayMeal.meal_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-300 dark:text-white/30 text-xl">restaurant</span>
                            </div>
                          )}
                          <span className="text-[11px] font-semibold text-[#111812] dark:text-white text-center leading-tight line-clamp-2 w-full">
                            {mealWords ?? "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* ── Quick Access Grid ── */}
          <section className="px-4 mb-4">
            <h3 className="text-[#111812] dark:text-white text-base font-bold mb-3">
              Quick Access
            </h3>
            <div className="grid grid-cols-2 gap-3">

              {/* Meal Plan */}
              <button
                type="button"
                onClick={() =>
                  activePlan
                    ? navigate(`/week-plan/${activePlan.plan_id}`)
                    : navigate("/week-plan")
                }
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#1a2e1d] rounded-xl border border-gray-50 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-[20px]">calendar_month</span>
                </div>
                <div className="text-center">
                  <p className="text-[#111812] dark:text-white text-sm font-bold leading-tight">Meal Plan</p>
                  <p className="text-[#618968] text-[10px] mt-0.5">View your weekly plan</p>
                </div>
              </button>

              {/* Grocery List */}
              <button
                type="button"
                onClick={() => navigate("/grocery")}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#1a2e1d] rounded-xl border border-gray-50 dark:border-gray-800 hover:border-primary/30 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">shopping_cart</span>
                </div>
                <div className="text-center">
                  <p className="text-[#111812] dark:text-white text-sm font-bold leading-tight">Grocery List</p>
                  <p className="text-[#618968] text-[10px] mt-0.5">See items &amp; prices</p>
                </div>
              </button>

              {/* New Plan */}
              <button
                type="button"
                onClick={() => navigate("/new-plan")}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#1a2e1d] rounded-xl border border-gray-50 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-400 text-[20px]">auto_awesome</span>
                </div>
                <div className="text-center">
                  <p className="text-[#111812] dark:text-white text-sm font-bold leading-tight">New Plan</p>
                  <p className="text-[#618968] text-[10px] mt-0.5">Generate with AI</p>
                </div>
              </button>

              {/* Profile */}
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-[#1a2e1d] rounded-xl border border-gray-50 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800 transition-all shadow-sm"
              >
                <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-400 text-[20px]">person</span>
                </div>
                <div className="text-center">
                  <p className="text-[#111812] dark:text-white text-sm font-bold leading-tight">Profile</p>
                  <p className="text-[#618968] text-[10px] mt-0.5">Manage your info</p>
                </div>
              </button>

            </div>
          </section>

          {/* ── Plan History ── */}
          {recentPlans.length > 0 && (
            <section className="px-4 mb-6">
              <h3 className="text-[#111812] dark:text-white text-base font-bold mb-3">
                Recent Plans
              </h3>
              <div className="flex flex-col gap-2">
                {recentPlans.map((plan) => {
                  const gt         = groceryTotals[plan.plan_id];
                  const hasGrocery = gt != null;
                  const within     = hasGrocery && gt <= plan.total_budget;

                  return (
                    <button
                      key={plan.plan_id}
                      type="button"
                      onClick={() => navigate(`/week-plan/${plan.plan_id}`)}
                      className="flex items-center justify-between bg-white dark:bg-[#1a2e1d] rounded-xl p-4 border border-gray-50 dark:border-gray-800 shadow-sm hover:border-primary/20 transition-all text-left"
                    >
                      <div>
                        <p className="text-[#111812] dark:text-white text-sm font-bold leading-tight">
                          {formatDateRange(plan.start_date, plan.end_date)}
                        </p>
                        <p className="text-[#618968] text-xs mt-0.5">
                          Budget: {formatFCFA(plan.total_budget)}
                          {hasGrocery && ` · Cost: ${formatFCFA(gt)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {hasGrocery && (
                          <span
                            className={[
                              "text-[10px] font-bold px-2 py-0.5 rounded-full",
                              within
                                ? "bg-primary/10 text-primary"
                                : "bg-red-50 dark:bg-red-900/20 text-red-500",
                            ].join(" ")}
                          >
                            {within ? "✓ Within budget" : "Over budget"}
                          </span>
                        )}
                        <span className="material-symbols-outlined text-gray-300 text-base">
                          chevron_right
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

        </main>

        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}
