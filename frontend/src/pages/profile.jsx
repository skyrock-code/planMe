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
  const [preferences, setPreferences] = useState([]);
  const [allergies, setAllergies] = useState([]);

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
      const data = await authService.getProfile();
      setProfile(data);

      // Initialize editable fields from real profile data
      setBudget(String(data.preferred_budget ?? 50000));
      setServings(data.household_size ?? 2);
      setLocation(data.location ?? "Yaoundé");
      setFrequency(data.cooking_frequency ?? "every_2_days");

      // diets comes as array of strings: ["spicy", "halal"]
      // Map to the chip format the Profile UI expects
      setPreferences(
        (data.diets || []).map((d) => ({
          key: d,
          label: d.charAt(0).toUpperCase() + d.slice(1),
          active: true,
        }))
      );

      // allergies comes as array of strings: ["peanuts", "shellfish"]
      setAllergies(data.allergies || []);
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
            <h3 className="text-lg font-bold px-6 pb-2 pt-4">
              Dietary Preferences
            </h3>
            <div className="flex gap-3 px-6 py-2 flex-wrap">
              {preferences.length > 0 ? (
                preferences.map((pref) => (
                  <Chip
                    key={pref.key}
                    label={pref.label}
                    variant="dietary"
                    active={pref.active}
                  />
                ))
              ) : (
                <p className="text-sm text-[#618968]">No preferences set</p>
              )}
            </div>
          </div>

          {/* ── Allergies section ── */}
          <div className="pt-2">
            <h3 className="text-lg font-bold px-6 pb-2 pt-4">Allergies</h3>
            <div className="flex gap-3 px-6 py-2 flex-wrap">
              {allergies.length > 0 ? (
                allergies.map((allergy) => (
                  <Chip
                    key={allergy}
                    label={allergy}
                    variant="allergy"
                  />
                ))
              ) : (
                <p className="text-sm text-[#618968]">No allergies recorded</p>
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