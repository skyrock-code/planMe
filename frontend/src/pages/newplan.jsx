/**
 * @file NewPlan.jsx
 * @description Create New Plan screen for the PlanMe app.
 *              Allows users to set plan duration, budget, servings,
 *              cooking frequency, and describe their meal preferences via a text prompt.
 *              On submission, creates a plan via Flask backend and navigates to WeekPlan.
 * @module pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import planService from "../services/planService";
import groceryService from "../services/groceryService";
import TopAppBar from "../components/layout/TopAppBar";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PREFERENCE_CHIPS = [
  { label: "#Healthy",      value: "healthy" },
  { label: "#Traditional",  value: "traditional" },
  { label: "#FastPrep",     value: "fast preparation" },
  { label: "#Budget",       value: "budget friendly" },
  { label: "#Spicy",        value: "spicy" },
  { label: "#LightMeals",   value: "light meals" },
  { label: "#HighProtein",  value: "high protein" },
  { label: "#Vegetarian",   value: "vegetarian" },
];

/**
 * Plan duration options for the segmented toggle.
 */
const DURATIONS = ["Daily", "Weekly"];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * NewPlan page component.
 *
 * Collects:
 * - Plan duration (Daily or Weekly)
 * - Budget in FCFA
 * - Number of servings
 * - Free-text meal preference prompt
 *
 * On submission, navigates to /week-plan.
 * In Phase 4, the form data will be sent to the Flask meal
 * generation API which uses budget as the primary constraint.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function NewPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Form state ──
  const [duration, setDuration]       = useState("Weekly");
  const [budget, setBudget]           = useState("");
  const [servings, setServings]       = useState("1");
  const [frequency, setFrequency]     = useState("every_2_days");
  const [selectedPrefs, setSelectedPrefs] = useState([]);

  // ── API state ──
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Review modal state ──
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [generatedPlanId, setGeneratedPlanId] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── Plan Date Calculation ──
  function getPlanDates(duration) {
    const today = new Date();
    const start_date = today.toISOString().split("T")[0];

    let end_date;
    if (duration === "Daily") {
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);
      end_date = nextDay.toISOString().split("T")[0];
    } else {
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);
      end_date = endDate.toISOString().split("T")[0];
    }

    return { start_date, end_date };
  }

  function handleChipToggle(value) {
    setSelectedPrefs((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  /**
   * Handles plan generation.
   * Calls Flask meal generation API with form data.
   * On success, navigates to the generated plan.
   */
  async function handleGenerate() {
    if (!budget || !servings) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!user?.user_id) {
      setError("User not authenticated.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const { start_date, end_date } = getPlanDates(duration);

      const prompt =
        selectedPrefs.length > 0
          ? `User prefers: ${selectedPrefs.join(", ")}`
          : "no specific preferences";

      const planData = {
        user_id: user.user_id,
        start_date,
        end_date,
        budget: parseFloat(budget),
        servings: parseInt(servings, 10),
        cooking_frequency: frequency,
        prompt,
      };

      const response = await planService.createPlan(planData);
      setGeneratedPlanId(response.plan_id);

      if (response.needs_review && response.needs_review.length > 0) {
        setReviewItems(response.needs_review);
        setShowReviewModal(true);
      } else {
        navigate(`/week-plan/${response.plan_id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to create plan. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-white dark:bg-background-dark shadow-xl overflow-x-hidden">

      {/* ── Sticky top bar ── */}
      <TopAppBar
        title="Create New Plan"
        onBack={() => navigate(-1)}
      />

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">

        {/* ── Plan Duration toggle ── */}
        <div className="pt-6">
          <p className="text-[#111812] dark:text-white text-base font-semibold px-1 pb-3">
            Plan Duration
          </p>

          {/* Segmented control — Daily / Weekly */}
          <div className="flex h-12 w-full items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 p-1">
            {DURATIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDuration(option)}
                className={[
                  "flex-1 h-full rounded-full text-sm font-semibold transition-all",
                  duration === option
                    ? "bg-white dark:bg-white/20 shadow-sm text-[#111812] dark:text-white"
                    : "text-[#618968]",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* ── Budget field ── */}
        <div className="pt-8">
          <h3 className="text-[#111812] dark:text-white text-lg font-bold leading-tight tracking-tight pb-3">
            Estimated Budget
          </h3>
          <Input
            placeholder="e.g. 5000"
            type="number"
            shape="box"
            suffix="FCFA"
            helper="Enter your budget for the entire duration."
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="0"
          />
        </div>

        {/* ── Servings field ── */}
        <div className="pt-8">
          <h3 className="text-[#111812] dark:text-white text-lg font-bold leading-tight tracking-tight pb-1">
            Number of Servings
          </h3>
          <p className="text-[#618968] dark:text-gray-400 text-sm font-medium pb-3">
            How many people are you cooking for?
          </p>
          <Input
            placeholder="e.g. 2"
            type="number"
            shape="box"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            min="1"
          />
        </div>

        {/* ── Cooking Frequency dropdown ── */}
        <div className="pt-8">
          <h3 className="text-[#111812] dark:text-white text-lg font-bold leading-tight tracking-tight pb-3">
            Cooking Frequency
          </h3>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full h-12 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="once_daily">Once a day</option>
            <option value="twice_daily">Twice a day</option>
            <option value="every_2_days">Every 2 days</option>
            <option value="every_3_days">Every 3 days</option>
            <option value="flexible">Flexible</option>
          </select>
          <p className="text-xs text-gray-400 mt-2 px-1">
            How often do you plan to cook?
          </p>
        </div>

        {/* ── Meal Preferences chips ── */}
        <div className="pt-8 pb-8">
          <h3 className="text-[#111812] dark:text-white text-lg font-bold leading-tight tracking-tight pb-1">
            Meal Preferences
          </h3>
          <p className="text-[#618968] dark:text-gray-400 text-sm font-medium pb-4">
            Select what applies to you this week
          </p>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_CHIPS.map((chip) => {
              const selected = selectedPrefs.includes(chip.value);
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => handleChipToggle(chip.value)}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                    selected
                      ? "bg-primary text-white border-primary"
                      : "bg-transparent text-[#618968] border-[#dbe6dd] dark:border-white/10 dark:text-gray-300",
                  ].join(" ")}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Fixed bottom CTA button ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-6 bg-gradient-to-t from-white dark:from-background-dark via-white/95 dark:via-background-dark/95 to-transparent">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl p-3">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon="auto_awesome"
          loading={loading}
          onClick={handleGenerate}
        >
          Generate My Plan
        </Button>
        {/* iOS home indicator spacing */}
        <div className="h-4" />
      </div>

      {/* ── Always-at-home review modal ── */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-background-dark rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[#111812] dark:text-white mb-1">
              Still have these at home?
            </h3>
            <p className="text-sm text-[#618968] mb-4">
              You've had these items marked "always at home" for 7 plans. Are they still available?
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {reviewItems.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={reviewLoading}
                onClick={async () => {
                  setReviewLoading(true);
                  try {
                    for (const item of reviewItems) {
                      await groceryService.resetAtHomeCounter(item);
                    }
                  } finally {
                    setShowReviewModal(false);
                    navigate(`/week-plan/${generatedPlanId}`);
                  }
                }}
                className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                Yes, still have them
              </button>
              <button
                type="button"
                disabled={reviewLoading}
                onClick={async () => {
                  setReviewLoading(true);
                  try {
                    for (const item of reviewItems) {
                      await groceryService.removeFromAtHome(item);
                    }
                  } finally {
                    setShowReviewModal(false);
                    navigate(`/week-plan/${generatedPlanId}`);
                  }
                }}
                className="flex-1 border border-red-400 text-red-500 font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                No, remove them
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}