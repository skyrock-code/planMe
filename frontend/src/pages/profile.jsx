/**
 * @file Profile.jsx
 * @description Profile & Settings screen for the PlanMe app.
 *              Shows user info, weekly budget, default servings,
 *              dietary preferences, allergies, account settings,
 *              and a logout button.
 *              Matches the profile.html design exactly.
 * @module pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopAppBar from "../components/layout/TopAppBar";
import ServingsCounter from "../components/ui/ServingsCounter";
import Chip from "../components/ui/Chip";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Hardcoded data for UI — will come from auth context + API in Phase 4.

/**
 * Mock user profile data.
 */
const MOCK_USER = {
  name: "Amadou Bello",
  email: "amadou.bello@email.com",
  location: "Yaoundé, Cameroon",
};

/**
 * Initial dietary preference chips.
 * Each has a key, display label, optional icon, and active state.
 */
const INITIAL_PREFERENCES = [
  { key: "spicy",       label: "Spicy",       icon: "local_fire_department", active: true  },
  { key: "vegetarian",  label: "Vegetarian",  icon: null,                    active: false },
  { key: "halal",       label: "Halal",       icon: null,                    active: true  },
  { key: "traditional", label: "Traditional", icon: null,                    active: false },
];

/**
 * Account settings menu items shown at the bottom of the profile.
 */
const SETTINGS_ITEMS = [
  { key: "personal",   label: "Personal Details",  icon: "person",        type: "nav"    },
  { key: "reminders",  label: "Meal Reminders",    icon: "notifications", type: "toggle" },
  { key: "language",   label: "Language",          icon: "language",      value: "English", type: "nav" },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * Profile page component.
 *
 * Displays and allows editing of:
 * - User avatar, name, email, location
 * - Weekly budget (in FCFA)
 * - Default servings count
 * - Dietary preference chips (toggleable)
 * - Allergy tags (dismissible)
 * - Account settings (navigation items + toggle)
 * - Logout button
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Profile() {
  const navigate = useNavigate();

  // ── Local state ──
  const [budget, setBudget]           = useState("50,000");
  const [servings, setServings]       = useState(2);
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [allergies, setAllergies]     = useState(["Peanuts", "Shellfish"]);
  const [reminders, setReminders]     = useState(true);

  /**
   * Toggles a dietary preference chip on or off.
   * @param {string} key - The preference key to toggle
   */
  function handlePreferenceToggle(key) {
    setPreferences((prev) =>
      prev.map((p) => (p.key === key ? { ...p, active: !p.active } : p))
    );
  }

  /**
   * Removes an allergy from the list by name.
   * @param {string} name - The allergy label to remove
   */
  function handleDismissAllergy(name) {
    setAllergies((prev) => prev.filter((a) => a !== name));
  }

  /**
   * Handles logout.
   * Placeholder — will clear JWT token from storage in Phase 4.
   */
  function handleLogout() {
    // TODO: clear auth token from localStorage, reset context
    navigate("/");
  }

  return (
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
          {/* Avatar circle — TODO: replace with real image from API */}
          <div className="w-32 h-32 rounded-full border-4 border-primary/20 bg-primary/10 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-primary text-6xl">
              person
            </span>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-[22px] font-bold">{MOCK_USER.name}</p>
            <p className="text-[#618968] dark:text-primary text-base">{MOCK_USER.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="material-symbols-outlined text-sm text-[#618968]">location_on</span>
              <p className="text-[#618968] dark:text-gray-400 text-sm">{MOCK_USER.location}</p>
            </div>
          </div>
        </div>

        {/* ── Weekly Budget card ── */}
        <div className="px-4 py-2">
          <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm border border-gray-50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Weekly Budget</h3>
              <span className="material-symbols-outlined text-primary">payments</span>
            </div>
            <Input
              type="text"
              shape="box"
              suffix="FCFA"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              helper="Approx. 7,150 FCFA per day"
            />
          </div>
        </div>

        {/* ── Default Servings card ── */}
        <div className="px-4 py-2 mt-2">
          <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm border border-gray-50 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Default Servings</h3>
              <span className="material-symbols-outlined text-primary">group</span>
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

        {/* ── Dietary Preferences section ── */}
        <div className="pt-4">
          <h3 className="text-lg font-bold px-6 pb-2 pt-4">
            Dietary Preferences
          </h3>
          <div className="flex gap-3 px-6 py-2 flex-wrap">
            {preferences.map((pref) => (
              <Chip
                key={pref.key}
                label={pref.label}
                variant="dietary"
                icon={pref.icon}
                active={pref.active}
                onToggle={() => handlePreferenceToggle(pref.key)}
              />
            ))}
            {/* Add new preference */}
            <Chip label="Add" variant="dietary" icon="add" />
          </div>
        </div>

        {/* ── Allergies section ── */}
        <div className="pt-2">
          <h3 className="text-lg font-bold px-6 pb-2 pt-4">Allergies</h3>
          <div className="flex gap-3 px-6 py-2 flex-wrap">
            {allergies.map((allergy) => (
              <Chip
                key={allergy}
                label={allergy}
                variant="allergy"
                onDismiss={() => handleDismissAllergy(allergy)}
              />
            ))}
            {/* Add allergy */}
            <Chip label="Add Allergy" variant="dietary" icon="add" />
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
                      reminders ? "bg-primary" : "bg-gray-300 dark:bg-gray-600",
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
                      <span className="text-gray-400 text-sm">{item.value}</span>
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

        {/* ── Logout button ── */}
        <div className="px-4 mt-10 pb-10">
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
  );
}