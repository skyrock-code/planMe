import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import Button from "../components/ui/Button";

const COOKING_FREQ_OPTIONS = [
  { label: "Every day",    value: "once_daily" },
  { label: "Every 2 days", value: "every_2_days" },
  { label: "Every 3 days", value: "every_3_days" },
  { label: "Flexible",     value: "flexible" },
];

const DIET_CHIPS = [
  "Spicy",
  "Traditional",
  "Halal",
  "Vegetarian",
  "Grilled",
  "Vegan",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [householdSize,     setHouseholdSize]     = useState(2);
  const [budget,            setBudget]            = useState("");
  const [cookingFrequency,  setCookingFrequency]  = useState("every_2_days");
  const [selectedDiets,     setSelectedDiets]     = useState([]);
  const [allergyInput,      setAllergyInput]      = useState("");
  const [allergies,         setAllergies]         = useState([]);
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState("");

  // ── Household stepper ──
  function decreaseSize() { setHouseholdSize((n) => Math.max(1, n - 1)); }
  function increaseSize() { setHouseholdSize((n) => Math.min(10, n + 1)); }

  // ── Diet chip toggle ──
  function toggleDiet(diet) {
    setSelectedDiets((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
    );
  }

  // ── Allergy input ──
  function addAllergy() {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    if (allergies.includes(trimmed.toLowerCase())) return;
    setAllergies((prev) => [...prev, trimmed.toLowerCase()]);
    setAllergyInput("");
  }

  function removeAllergy(allergen) {
    setAllergies((prev) => prev.filter((a) => a !== allergen));
  }

  // ── Submit ──
  async function handleComplete() {
    if (!budget || Number(budget) <= 0) {
      setError("Please enter your weekly food budget.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await authService.updateProfile({
        household_size:    householdSize,
        preferred_budget:  Number(budget),
        cooking_frequency: cookingFrequency,
      });

      await Promise.all(selectedDiets.map((diet) =>
        authService.addDiet(diet.toLowerCase())
      ));

      await Promise.all(allergies.map((allergen) =>
        authService.addAllergy(allergen)
      ));

      localStorage.setItem(`planme_onboarded_${user.user_id}`, "true");
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong. Please try again."
      );
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-10">

      {/* Header */}
      <div className="px-4 pt-10 pb-6 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-extrabold text-[#111812] dark:text-white">
          Let's get to know you !
        </h1>
        <p className="text-sm text-[#618968] mt-2">
          Help us plan better meals for your household
        </p>
      </div>

      <div className="max-w-md mx-auto">

        {/* ── STEP 1: Household size ── */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-5 mx-4 mb-4">
          <p className="text-sm font-bold text-[#111812] dark:text-white mb-4">
            How many people are you cooking for?
          </p>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={decreaseSize}
              disabled={householdSize <= 1}
              className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center disabled:opacity-30 hover:bg-primary/20 transition-colors"
            >
              −
            </button>
            <span className="text-4xl font-extrabold text-[#111812] dark:text-white w-10 text-center">
              {householdSize}
            </span>
            <button
              type="button"
              onClick={increaseSize}
              disabled={householdSize >= 10}
              className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center disabled:opacity-30 hover:bg-primary/20 transition-colors"
            >
              +
            </button>
          </div>
          <p className="text-center text-xs text-[#618968] mt-3">
            {householdSize === 1 ? "Just you" : `${householdSize} people`}
          </p>
        </div>

        {/* ── STEP 2: Weekly budget ── */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-5 mx-4 mb-4">
          <p className="text-sm font-bold text-[#111812] dark:text-white mb-1">
            What is your weekly food budget?
          </p>
          <p className="text-xs text-[#618968] mb-3">
            This helps us suggest affordable meals
          </p>
          <div className="flex items-center border border-[#618968]/30 rounded-xl overflow-hidden focus-within:border-primary transition-colors">
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 25000"
              className="flex-1 px-4 py-3 bg-transparent text-[#111812] dark:text-white text-sm outline-none"
            />
            <span className="px-4 py-3 text-sm font-bold text-[#618968] bg-gray-50 dark:bg-white/5 border-l border-[#618968]/20">
              FCFA
            </span>
          </div>
        </div>

        {/* ── STEP 3: Cooking frequency ── */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-5 mx-4 mb-4">
          <p className="text-sm font-bold text-[#111812] dark:text-white mb-3">
            How often do you cook?
          </p>
          <div className="flex flex-wrap gap-2">
            {COOKING_FREQ_OPTIONS.map((opt) => {
              const active = cookingFrequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCookingFrequency(opt.value)}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-white dark:bg-white/5 border-[#618968]/30 text-[#618968] hover:border-primary/50",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 4: Diet preferences ── */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-5 mx-4 mb-4">
          <p className="text-sm font-bold text-[#111812] dark:text-white mb-1">
            Any food preferences?
          </p>
          <p className="text-xs text-[#618968] mb-3">Select all that apply</p>
          <div className="flex flex-wrap gap-2">
            {DIET_CHIPS.map((diet) => {
              const active = selectedDiets.includes(diet);
              return (
                <button
                  key={diet}
                  type="button"
                  onClick={() => toggleDiet(diet)}
                  className={[
                    "px-4 py-2 rounded-full text-sm font-semibold border transition-all",
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-white dark:bg-white/5 border-[#618968]/30 text-[#618968] hover:border-primary/50",
                  ].join(" ")}
                >
                  {active && <span className="mr-1 text-xs">✓</span>}
                  {diet}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── STEP 5: Allergies ── */}
        <div className="bg-white dark:bg-white/5 rounded-xl shadow-sm p-5 mx-4 mb-4">
          <p className="text-sm font-bold text-[#111812] dark:text-white mb-1">
            Any food allergies?
          </p>
          <p className="text-xs text-[#618968] mb-3">
            We will never suggest meals with these
          </p>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={allergyInput}
              onChange={(e) => setAllergyInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAllergy()}
              placeholder="e.g. peanuts, gluten..."
              className="flex-1 px-4 py-2.5 border border-[#618968]/30 rounded-xl text-sm text-[#111812] dark:text-white bg-transparent outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={addAllergy}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              Add
            </button>
          </div>

          {allergies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergen) => (
                <span
                  key={allergen}
                  className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full border border-red-100 dark:border-red-800"
                >
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergen)}
                    className="text-red-400 hover:text-red-600 transition-colors leading-none"
                    aria-label={`Remove ${allergen}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-[#618968] mt-3">Optional — you can update this later in Profile</p>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="mx-4 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── CTA ── */}
        <div className="px-4 mt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleComplete}
            disabled={saving}
            icon={saving ? undefined : "rocket_launch"}
          >
            {saving ? "Saving..." : "Start Planning "}
          </Button>
        </div>

      </div>
    </div>
  );
}
