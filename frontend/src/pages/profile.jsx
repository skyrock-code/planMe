/**
 * @file Profile.jsx
 * @description Profile & Settings screen for the PlanMe app.
 *              Loads real user profile from Flask backend.
 *              Allows editing of budget, servings, location, cooking frequency.
 *              Shows dietary preferences and allergies from API.
 * @module pages
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import authService from "../services/authService";
import { PageWrapper } from "../components/common";
import TopAppBar from "../components/layout/TopAppBar";
import ServingsCounter from "../components/ui/ServingsCounter";
import Chip from "../components/ui/Chip";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── SETTINGS MENU ────────────────────────────────────────────────────────────

const SETTINGS_ITEMS = [
  { key: "personal", label: "Personal Details", icon: "person", type: "nav" },
  { key: "reminders", label: "Meal Reminders", icon: "notifications", type: "toggle" },
  { key: "language", label: "Language", icon: "language", value: "English", type: "nav" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * Profile page component.
 *
 * Displays and allows editing of:
 * - Weekly budget (in FCFA)
 * - Default servings count
 * - Location
 * - Cooking frequency
 * - Dietary preferences (read-only from API)
 * - Allergies (read-only from API)
 * - Account settings
 * - Logout button
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ── State ──
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable field state
  const [budget, setBudget] = useState("");
  const [servings, setServings] = useState(2);
  const [location, setLocation] = useState("");
  const [frequency, setFrequency] = useState("every_2_days");

  // Allergies — loaded from API, stored with their DB ids
  const [allergies, setAllergies] = useState([]);
  // Shape: [{ id: 1, allergen: "peanuts" }, ...]

  // Diet preferences — loaded from API, stored with DB ids
  const [diets, setDiets] = useState([]);
  // Shape: [{ id: 1, diet_type: "spicy" }, ...]

  // Allergy input field state
  const [newAllergen, setNewAllergen] = useState("");
  const [addingAlg, setAddingAlg] = useState(false);
  const [algError, setAlgError] = useState("");

  // Diet preference loading state
  const [togglingDiet, setTogglingDiet] = useState(null);
  // null or diet_type string being toggled

  // Account settings state
  const [reminders, setReminders] = useState(true);

  // ── Data Fetching ──
  /**
   * Fetches the authenticated user's full profile from Flask.
   * Populates all editable fields with real data.
   * Called on mount.
   */
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch allergies and diets in parallel with profile
      const [profileData, allergyData, dietData] = await Promise.all([
        authService.getProfile(),
        authService.getAllergies(),
        authService.getDiets(),
      ]);

      // Set all state from real API data
      setProfile(profileData);
      setAllergies(allergyData);
      setDiets(dietData);

      // Initialize other editable fields from profile...
      setBudget(String(profileData.preferred_budget ?? 50000));
      setServings(profileData.household_size ?? 2);
      setLocation(profileData.location ?? "Yaoundé");
      setFrequency(profileData.cooking_frequency ?? "every_2_days");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Save Handler ──
  /**
   * Saves updated profile fields to the backend.
   * Only sends fields the user has changed.
   * Shows brief success feedback on completion.
   */
  async function handleSave() {
    try {
      setSaving(true);
      setSaveSuccess(false);

      await authService.updateProfile({
        preferred_budget: parseFloat(budget) || 50000,
        household_size: servings,
        location: location,
        cooking_frequency: frequency,
      });

      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ── Logout Handler ──
  function handleLogout() {
    logout();
  }

  /**
   * Toggles a dietary preference on or off.
   * If already active (exists in diets array) → delete it.
   * If not active → add it.
   *
   * @param {string} dietType - The preference to toggle
   */
  async function handleDietToggle(dietType) {
    try {
      setTogglingDiet(dietType);

      const existing = diets.find(d => d.diet_type === dietType);

      if (existing) {
        // Remove: already active
        await authService.deleteDiet(existing.id);
        setDiets(prev => prev.filter(d => d.id !== existing.id));
      } else {
        // Add: not yet active
        const result = await authService.addDiet(dietType);
        setDiets(prev => [...prev, { id: result.id, diet_type: dietType }]);
      }

    } catch (err) {
      setError(
        err.response?.data?.error ||
        "Failed to update preference."
      );
    } finally {
      setTogglingDiet(null);
    }
  }

  /**
   * Adds a new allergen to the user's list.
   * Validates input before calling API.
   */
  async function handleAddAllergen() {
    const trimmed = newAllergen.trim();
    if (!trimmed) return;

    try {
      setAddingAlg(true);
      setAlgError("");

      const result = await authService.addAllergy(trimmed);
      setAllergies(prev => [...prev, {
        id: result.id,
        allergen: result.allergen
      }]);
      setNewAllergen("");  // clear input

    } catch (err) {
      // Show duplicate error or other API error
      setAlgError(
        err.response?.data?.error ||
        "Failed to add allergy."
      );
    } finally {
      setAddingAlg(false);
    }
  }

  /**
   * Removes an allergen by its database ID.
   * Updates local state immediately for instant UI feedback.
   *
   * @param {number} allergyId - The UserAllergy record ID
   */
  async function handleRemoveAllergen(allergyId) {
    try {
      await authService.deleteAllergy(allergyId);
      setAllergies(prev => prev.filter(a => a.id !== allergyId));
    } catch (err) {
      setError("Failed to remove allergy.");
    }
  }

  // ── Render ──
  return (
    <PageWrapper
      loading={loading}
      error={error}
      onRetry={fetchProfile}
      loadingMsg="Loading your profile..."
    >
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#111812] dark:text-white pb-24">

        {/* ── Sticky top bar ── */}
        <TopAppBar
          title="Profile & Settings"
          onBack={() => navigate(-1)}
          rightIcon="edit"
          onRightAction={() => {}}
        />

        <div className="max-w-md mx-auto">

          {/* ── Profile header — avatar, name, email, location ── */}
          <div className="flex flex-col items-center gap-3 p-6">
            {/* Avatar circle */}
            <div className="w-32 h-32 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden">
              <span className="material-symbols-outlined text-primary text-6xl">
                person
              </span>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[22px] font-bold">{profile?.username || "User"}</p>
              <p className="text-[#618968] dark:text-primary text-base">
                {profile?.email}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm text-[#618968]">
                  location_on
                </span>
                <p className="text-[#618968] dark:text-gray-400 text-sm">
                  {location}
                </p>
              </div>
            </div>
          </div>

          {/* ── Weekly Budget card ── */}
          <div className="px-4 py-2">
            <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm border border-gray-50 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Weekly Budget</h3>
                <span className="material-symbols-outlined text-primary">
                  payments
                </span>
              </div>
              <Input
                type="text"
                shape="box"
                suffix="FCFA"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                helper={`Approx. ${Math.round(parseFloat(budget || 50000) / 7).toLocaleString()} FCFA per day`}
              />
            </div>
          </div>

          {/* ── Default Servings card ── */}
          <div className="px-4 py-2 mt-2">
            <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm border border-gray-50 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Default Servings</h3>
                <span className="material-symbols-outlined text-primary">
                  group
                </span>
              </div>
              <ServingsCounter
                value={servings}
                onChange={setServings}
                helper="Average number of people per meal"
                min={1}
                max={10}
              />
            </div>
          </div>

          {/* ── Cooking Frequency card ── */}
          <div className="px-4 py-2 mt-2">
            <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm border border-gray-50 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold">Cooking Frequency</h3>
                <span className="material-symbols-outlined text-primary">
                  local_fire_department
                </span>
              </div>
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
                This affects how your weekly meal plan is structured.
              </p>
            </div>
          </div>

          {/* ── Dietary Preferences section ── */}
          <div className="pt-4">
            <h3 className="text-lg font-bold px-6 pb-2 pt-4
                           text-[#111812] dark:text-white">
              Dietary Preferences
            </h3>
            <p className="text-xs text-[#618968] px-6 pb-3">
              Tap to add or remove. These guide your AI meal plan.
            </p>
            <div className="flex gap-3 px-6 py-2 flex-wrap">
              {/* Predefined preference options — all toggleable */}
              {[
                { key: "spicy",       label: "Spicy",       icon: "local_fire_department" },
                { key: "traditional", label: "Traditional",  icon: null },
                { key: "halal",       label: "Halal",        icon: null },
                { key: "vegetarian",  label: "Vegetarian",   icon: null },
                { key: "grilled",     label: "Grilled",      icon: null },
                { key: "vegan",       label: "Vegan",        icon: null },
              ].map(pref => {
                const isActive   = diets.some(d => d.diet_type === pref.key);
                const isToggling = togglingDiet === pref.key;

                return (
                  <button
                    key={pref.key}
                    type="button"
                    onClick={() => handleDietToggle(pref.key)}
                    disabled={isToggling}
                    aria-pressed={isActive}
                    className={[
                      "flex h-10 items-center gap-2 rounded-full px-4",
                      "text-sm font-semibold transition-all duration-150",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isToggling ? "opacity-50" : "",
                      isActive
                        ? "bg-primary text-[#111812]"
                        : "bg-white dark:bg-[#1a2e1d] border border-gray-100 dark:border-gray-800 text-[#111812] dark:text-white",
                    ].join(" ")}
                  >
                    {isActive && (
                      <span className="material-symbols-outlined text-sm"
                            aria-hidden="true">
                        check_circle
                      </span>
                    )}
                    {!isActive && pref.icon && (
                      <span className="material-symbols-outlined text-sm"
                            aria-hidden="true">
                        {pref.icon}
                      </span>
                    )}
                    <span>{pref.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Allergies section ── */}
          <div className="pt-2">
            <h3 className="text-lg font-bold px-6 pb-2 pt-4
                           text-[#111812] dark:text-white">
              Allergies
            </h3>
            <p className="text-xs text-[#618968] px-6 pb-3">
              Add any foods you cannot eat. These are excluded from AI suggestions.
            </p>

            {/* Existing allergy chips — dismissible */}
            <div className="flex gap-3 px-6 py-2 flex-wrap">
              {allergies.map(allergy => (
                <div
                  key={allergy.id}
                  className="flex h-10 items-center gap-1 rounded-full pl-4 pr-3
                             bg-red-50 dark:bg-red-900/20
                             border border-red-100 dark:border-red-900/30"
                >
                  <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                    {allergy.allergen}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergen(allergy.id)}
                    aria-label={`Remove ${allergy.allergen} allergy`}
                    className="hover:opacity-70 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-red-400 text-base">
                      close
                    </span>
                  </button>
                </div>
              ))}

              {/* Empty state */}
              {allergies.length === 0 && (
                <p className="text-sm text-[#618968] px-1">
                  No allergies added yet.
                </p>
              )}
            </div>

            {/* Add new allergy input */}
            <div className="px-6 pt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAllergen()}
                  placeholder="e.g. peanuts, shellfish, dairy..."
                  className="flex-1 h-11 rounded-full border border-[#dbe6dd]
                             dark:border-white/10 bg-white dark:bg-white/5
                             text-[#111812] dark:text-white px-4 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary
                             placeholder:text-[#618968]/60"
                />
                <button
                  type="button"
                  onClick={handleAddAllergen}
                  disabled={addingAlg || !newAllergen.trim()}
                  className="h-11 px-4 rounded-full bg-primary text-[#111812]
                             text-sm font-bold disabled:opacity-50
                             hover:bg-[#22d940] transition-colors"
                >
                  {addingAlg ? "..." : "Add"}
                </button>
              </div>

              {/* Allergy error message */}
              {algError && (
                <p className="text-red-500 text-xs mt-2 px-1">{algError}</p>
              )}
            </div>
          </div>

          {/* ── Account Settings list ── */}
          <div className="px-4 mt-6">
            <div className="bg-white dark:bg-[#1a2e1d] rounded-xl overflow-hidden border border-gray-50 dark:border-gray-800">
              {SETTINGS_ITEMS.map((item, index) => (
                <div
                  key={item.key}
                  className={[
                    "flex items-center justify-between p-4",
                    index < SETTINGS_ITEMS.length - 1
                      ? "border-b border-gray-50 dark:border-gray-800"
                      : "",
                  ].join(" ")}
                >
                  {/* Icon + label */}
                  <div className="flex items-center gap-3">
                    <div className="bg-background-light dark:bg-background-dark p-2 rounded-full">
                      <span className="material-symbols-outlined text-primary">
                        {item.icon}
                      </span>
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>

                  {/* Right side — toggle or chevron */}
                  {item.type === "toggle" ? (
                    /* Meal reminders toggle */
                    <button
                      type="button"
                      onClick={() => setReminders((prev) => !prev)}
                      aria-label={`Toggle ${item.label}`}
                      aria-checked={reminders}
                      role="switch"
                      className={[
                        "w-12 h-6 rounded-full relative transition-colors",
                        reminders
                          ? "bg-primary"
                          : "bg-gray-300 dark:bg-gray-600",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                          reminders ? "right-1" : "left-1",
                        ].join(" ")}
                      />
                    </button>
                  ) : (
                    /* Navigation arrow */
                    <div className="flex items-center gap-1">
                      {item.value && (
                        <span className="text-gray-400 text-sm">
                          {item.value}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-gray-400">
                        chevron_right
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Save success message ── */}
          {saveSuccess && (
            <div className="px-4 mt-4 mb-3">
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                <p className="text-primary text-sm font-bold text-center">
                  Profile saved successfully
                </p>
              </div>
            </div>
          )}

          {/* ── Save Changes button ── */}
          <div className="px-4 mt-4">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon="save"
              loading={saving}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>

          {/* ── Logout button ── */}
          <div className="px-4 mt-4 pb-10">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              icon="logout"
              onClick={handleLogout}
            >
              Logout
            </Button>
            <p className="text-center text-gray-400 text-xs mt-4">
              PlanMe v1.0.0 — AI Engine v1.0
            </p>
          </div>
        </div>

        {/* ── Fixed bottom navigation ── */}
        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}