import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import planService from "../services/planService";
import aiService from "../services/aiService";
import groceryService from "../services/groceryService";
import TopAppBar from "../components/layout/TopAppBar";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import AIPromptSelector from "../components/ui/AIPromptSelector";

const PREFERENCE_CHIPS = [
  { label: "Healthy",      value: "healthy" },
  { label: "Traditional",  value: "traditional" },
  { label: "Fast Prep",    value: "fast preparation" },
  { label: "Budget",       value: "budget friendly" },
  { label: "Spicy",        value: "spicy" },
  { label: "Light Meals",  value: "light meals" },
  { label: "High Protein", value: "high protein" },
  { label: "Vegetarian",   value: "vegetarian" },
];

const DURATIONS = ["Daily", "Weekly"];

const COOKING_FREQ_OPTIONS = [
  { label: "Every day", value: "once_daily" },
  { label: "Every 2 days", value: "every_2_days" },
  { label: "Every 3 days", value: "every_3_days" },
  { label: "Flexible", value: "flexible" },
];

export default function NewPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [duration, setDuration] = useState("Weekly");
  const [budget, setBudget] = useState("");
  const [householdSize, setHouseholdSize] = useState(2);
  const [frequency, setFrequency] = useState("every_2_days");
  const [selectedPrefs, setSelectedPrefs] = useState([]);
  const [planMode, setPlanMode] = useState("standard");
  const [aiPrompt, setAiPrompt] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [generatedPlanId, setGeneratedPlanId] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  function getPlanDates(duration) {
    const today = new Date();
    const start_date = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (duration === "Daily" ? 1 : 6));
    return { start_date, end_date: endDate.toISOString().split("T")[0] };
  }

  function handleChipToggle(value) {
    setSelectedPrefs((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleGenerate() {
    if (!budget) { setError("Please fill in budget."); return; }
    if (!user?.user_id) { setError("User not authenticated. Please log in again."); return; }

    try {
      setError("");
      setLoading(true);
      const { start_date, end_date } = getPlanDates(duration);

      if (planMode === "standard") {
        const planData = {
          user_id: user.user_id,
          start_date,
          end_date,
          budget: parseFloat(budget),
          servings: householdSize,
          cooking_frequency: frequency,
        };

        const newPlan = await planService.createPlan(planData);
        if (!newPlan.plan_id) throw new Error("Failed to create plan.");

        setGeneratedPlanId(newPlan.plan_id);

        if (newPlan.needs_review && newPlan.needs_review.length > 0) {
          setReviewItems(newPlan.needs_review);
          setShowReviewModal(true);
        } else {
          navigate(`/week-plan/${newPlan.plan_id}`);
        }
      } else {
        // AI Smart mode
        if (!aiPrompt) { 
          setError("Please select or describe what you feel like eating."); 
          return; 
        }

        const response = await aiService.generateFromPrompt({
          user_id: user.user_id,
          prompt: aiPrompt,
          total_budget: parseFloat(budget),
          start_date,
          end_date,
          cooking_frequency: frequency,
        });

        if (!response?.plan_id) throw new Error("No plan_id returned from AI service");

        setGeneratedPlanId(response.plan_id);

        if (response.needs_review?.length > 0) {
          setReviewItems(response.needs_review);
          setShowReviewModal(true);
        } else {
          navigate(`/week-plan/${response.plan_id}`);
        }
      }
    } catch (err) {
      console.error("Plan generation error:", err);
      setError(err.response?.data?.error || err.message || "Failed to create plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full max-w-[430px] mx-auto flex-col bg-background-light dark:bg-background-dark shadow-xl overflow-x-hidden">

      {/* SVG BACKGROUND - Fixed behind everything */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Top right - Tomato */}
        <div className="absolute -top-10 -right-10 w-40 h-40 opacity-10">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="55" r="35" stroke="#2d5a27" strokeWidth="3" fill="none"/>
            <path d="M50 20 C55 10,65 8,70 15 C65 22,58 25,50 20Z" fill="#2d5a27"/>
            <path d="M45 22 C40 12,30 10,25 17 C30 24,38 27,45 22Z" fill="#2d5a27"/>
          </svg>
        </div>

        {/* Bottom left - Chili */}
        <div className="absolute -bottom-10 -left-10 w-48 h-48 opacity-10">
          <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M60 20 C70 10,85 15,80 30 C75 45,65 55,60 70 C55 55,45 45,40 30 C35 15,50 10,60 20Z" stroke="#2d5a27" strokeWidth="3" fill="none"/>
            <path d="M60 20 C55 15,50 18,52 25" stroke="#2d5a27" strokeWidth="2" fill="none"/>
          </svg>
        </div>

        {/* Center right - Avocado */}
        <div className="absolute top-1/3 -right-8 w-32 h-32 opacity-10">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="40" cy="45" rx="25" ry="30" stroke="#2d5a27" strokeWidth="3" fill="none"/>
            <circle cx="40" cy="45" r="12" fill="#2d5a27" fillOpacity="0.5"/>
          </svg>
        </div>

        {/* Bottom right - Banana */}
        <div className="absolute bottom-20 -right-6 w-36 h-36 opacity-10">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 70 C20 50,30 20,60 25 C75 28,85 40,80 55 C75 70,60 80,45 75 C35 72,25 80,30 70Z" stroke="#2d5a27" strokeWidth="3" fill="none"/>
          </svg>
        </div>

        {/* Top left - Leaf */}
        <div className="absolute top-20 -left-8 w-32 h-32 opacity-10">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 10 C30 30,20 50,40 70 C60 50,50 30,40 10Z" stroke="#2d5a27" strokeWidth="3" fill="none"/>
            <path d="M40 10 L40 70" stroke="#2d5a27" strokeWidth="2" strokeDasharray="4 4"/>
          </svg>
        </div>

        {/* Center - Okra slice (added) */}
        <div className="absolute top-1/2 left-1/4 w-24 h-24 opacity-10">
          <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="25" stroke="#2d5a27" strokeWidth="3" fill="none"/>
            <circle cx="40" cy="40" r="8" stroke="#2d5a27" strokeWidth="2" fill="none"/>
            <line x1="40" y1="15" x2="40" y2="65" stroke="#2d5a27" strokeWidth="2"/>
            <line x1="15" y1="40" x2="65" y2="40" stroke="#2d5a27" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      <TopAppBar
        title="Create New Plan"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1 overflow-y-auto px-5 pb-36">

        {/* Plan Duration */}
        <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">calendar_month</span>
            <span className="text-sm font-semibold text-[#111812] dark:text-white">Plan Duration</span>
          </div>
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

        {/* Budget */}
        <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">payments</span>
            <span className="text-sm font-semibold text-[#111812] dark:text-white">Budget</span>
          </div>
          <Input
            placeholder="e.g. 50000"
            type="number"
            shape="box"
            suffix="FCFA"
            helper="Total budget for the entire plan duration"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min="0"
          />
        </div>

        {/* Household Size */}
        <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">group</span>
            <span className="text-sm font-semibold text-[#111812] dark:text-white">Household Size</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setHouseholdSize((n) => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              −
            </button>
            <span className="text-2xl font-extrabold text-[#111812] dark:text-white w-12 text-center">
              {householdSize}
            </span>
            <button
              type="button"
              onClick={() => setHouseholdSize((n) => Math.min(10, n + 1))}
              className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-xs text-[#618968] text-center mt-2">
            {householdSize === 1 ? "Just you" : `${householdSize} people cooking`}
          </p>
        </div>

        {/* Cooking Frequency */}
        <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">local_fire_department</span>
            <span className="text-sm font-semibold text-[#111812] dark:text-white">Cooking Frequency</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COOKING_FREQ_OPTIONS.map((opt) => {
              const active = frequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-white dark:bg-white/5 border-[#dbe6dd] dark:border-white/10 text-[#618968] hover:border-primary/50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Planning Mode */}
        <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
            <span className="text-sm font-semibold text-[#111812] dark:text-white">Planning Mode</span>
          </div>
          <div className="flex h-12 w-full items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 p-1">
            {["Standard", "AI Smart"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPlanMode(option === "Standard" ? "standard" : "ai")}
                className={[
                  "flex-1 h-full rounded-full text-sm font-semibold transition-all",
                  planMode === (option === "Standard" ? "standard" : "ai")
                    ? "bg-white dark:bg-white/20 shadow-sm text-[#111812] dark:text-white"
                    : "text-[#618968]",
                ].join(" ")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Standard Mode - Preferences */}
        {planMode === "standard" && (
          <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl">restaurant_menu</span>
              <span className="text-sm font-semibold text-[#111812] dark:text-white">Preferences</span>
            </div>
            <p className="text-xs text-[#618968] mb-3">Select all that apply</p>
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
                        : "bg-white dark:bg-white/5 text-[#618968] border-[#dbe6dd] dark:border-white/10",
                    ].join(" ")}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Mode - Prompt Selector */}
        {planMode === "ai" && (
          <div className="mb-6 bg-white dark:bg-white/5 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
              <span className="text-sm font-semibold text-[#111812] dark:text-white">What are you in the mood for?</span>
            </div>
            <p className="text-xs text-[#618968] mb-3">Use prompts or describe freely</p>
            <AIPromptSelector
              selectedPrompt={aiPrompt}
              onSelect={setAiPrompt}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm font-medium text-center">{error}</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          onClick={handleGenerate}
        >
          Generate My Plan
        </Button>
        <div className="h-4" />
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-background-dark rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-[#111812] dark:text-white mb-1">
              Still have these at home?
            </h3>
            <p className="text-sm text-[#618968] mb-4">
              You have had these items marked "always at home" for 7 plans.
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