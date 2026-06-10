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
      {/* Top right — large pepper outline */}
      <svg
        className="absolute -top-8 -right-8 w-64 h-64 opacity-[0.15]"
        viewBox="0 0 200 200" fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="120" cy="80" rx="40" ry="70"
          stroke="currentColor" strokeWidth="6"
          style={{ color: '#2d5a27' }} transform="rotate(-20 120 80)" />
        <path d="M120 10 Q130 0 145 5 Q135 15 120 10Z"
          fill="currentColor" style={{ color: '#2d5a27' }} />
      </svg>

      {/* Bottom left — plantain bunch outline */}
      <svg
        className="absolute bottom-32 -left-6 w-52 h-52 opacity-[0.12]"
        viewBox="0 0 150 150" fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M20 130 Q10 80 40 50 Q70 20 100 40 Q80 70 60 90 Q40 110 20 130Z"
          stroke="currentColor" strokeWidth="5" fill="none"
          style={{ color: '#2d5a27' }} />
        <path d="M40 120 Q30 70 60 45 Q90 20 115 38"
          stroke="currentColor" strokeWidth="4" fill="none"
          style={{ color: '#2d5a27' }} />
      </svg>

      {/* Center right — tomato circle */}
      <svg
        className="absolute top-1/2 -right-4 w-40 h-40 opacity-[0.12]"
        viewBox="0 0 100 100" fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="55" r="35"
          stroke="currentColor" strokeWidth="5"
          style={{ color: '#2d5a27' }} />
        <path d="M50 20 Q55 10 65 12 Q58 22 50 20Z"
          fill="currentColor" style={{ color: '#2d5a27' }} />
        <path d="M50 20 Q45 8 35 10 Q42 20 50 20Z"
          fill="currentColor" style={{ color: '#2d5a27' }} />
      </svg>
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
                  className="shrink-0 flex items-center gap-1.5 bg-primary text-[#111812] text-xs font-bold px-3 py-2 rounded-full hover:bg-[#22d940] transition-colors"
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
                    View full plan
                  </button>
                </div>

                <div
                  className="flex gap-2 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: "none" }}
                >
                  {glanceDays.map((day) => {
                    const isToday   = day.dateStr === today;
                    const dayMeal   = getMealForDay(day.dateStr);
                    const mealImage = dayMeal ? getMealImage(dayMeal.meal_name) : null;
                    const shortName =
                      dayMeal
                        ? dayMeal.meal_name.length > 8
                          ? dayMeal.meal_name.slice(0, 8) + "…"
                          : dayMeal.meal_name
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
                        className={[
                          "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl min-w-[100px] transition-all shrink-0",
                          isToday
                            ? "bg-[#2d5a27] text-white shadow-md"
                            : "bg-white dark:bg-[#1a2e1d] border border-gray-100 dark:border-gray-800",
                        ].join(" ")}
                      >
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide ${
                            isToday ? "text-white/70" : "text-[#618968]"
                          }`}
                        >
                          {day.short}
                        </span>
                        <span
                          className={`text-sm font-extrabold ${
                            isToday ? "text-white" : "text-[#111812] dark:text-white"
                          }`}
                        >
                          {day.dateNum}
                        </span>

                        {/* Meal image or placeholder */}
                        {mealImage ? (
                          <img
                            src={mealImage}
                            alt={dayMeal.meal_name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white/20"
                          />
                        ) : (
                          <div
                            className={[
                              "w-16 h-16 rounded-full flex items-center justify-center border-2",
                              isToday
                                ? "border-white/20 bg-white/10"
                                : "border-dashed border-gray-200 dark:border-gray-700",
                            ].join(" ")}
                          >
                            <span
                              className={`material-symbols-outlined text-sm ${
                                isToday ? "text-white/50" : "text-gray-300 dark:text-gray-600"
                              }`}
                            >
                              add
                            </span>
                          </div>
                        )}

                        {/* Meal name truncated */}
                        <span
                          className={`text-[9px] font-semibold text-center leading-tight max-w-full truncate ${
                            isToday ? "text-white/80" : "text-[#618968]"
                          }`}
                          style={{ maxWidth: "96px" }}
                        >
                          {shortName ?? "—"}
                        </span>
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
