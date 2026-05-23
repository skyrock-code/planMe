/**
 * @file Chip.jsx
 * @description Reusable Chip/Tag component for the PlanMe app.
 *              Supports three visual styles:
 *              - dietary preference chips (active/inactive toggle)
 *              - allergy tags (red, dismissible)
 *              - hashtag chips (green tinted, used on NewPlan screen)
 *              All variants match the PlanMe design system exactly.
 * @module components/ui
 */

import { useState } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * Tailwind class maps for each chip variant.
 */
const VARIANTS = {
  /**
   * Dietary preference chip — toggles between active (green) and inactive (gray).
   * Used on the Profile screen dietary preferences section.
   */
  dietary: {
    active:
      "bg-primary text-[#111812] border-transparent",
    inactive:
      "bg-white dark:bg-[#1a2e1d] border border-gray-100 dark:border-gray-800 text-[#111812] dark:text-white",
  },

  /**
   * Allergy chip — always red tinted with an X dismiss button.
   * Used on the Profile screen allergies section.
   */
  allergy:
    "bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400",

  /**
   * Hashtag chip — green tinted, non-interactive display tag.
   * Used on the NewPlan screen meal preferences section.
   */
  hashtag:
    "bg-primary/10 text-primary border border-primary/20",
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe Chip component.
 *
 * Three use cases across the app:
 * 1. Dietary preference pills on Profile (toggleable active/inactive)
 * 2. Allergy tags on Profile (dismissible with X button)
 * 3. Hashtag suggestion chips on NewPlan (#Healthy, #Traditional, etc.)
 *
 * @component
 * @param {Object}    props
 * @param {string}    props.label       - Text displayed inside the chip
 * @param {'dietary'|'allergy'|'hashtag'} props.variant - Visual style (default: 'dietary')
 * @param {boolean}   props.active      - Active state for dietary variant (default: false)
 * @param {string}    props.icon        - Material Symbol name shown left of label (optional)
 * @param {function}  props.onToggle    - Called when a dietary chip is clicked (receives new active state)
 * @param {function}  props.onDismiss   - Called when the X on an allergy chip is clicked
 * @param {string}    props.className   - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function Chip({
  label,
  variant = "dietary",
  active = false,
  icon,
  onToggle,
  onDismiss,
  className = "",
}) {
  // ── Dietary chip: manage active state internally if no onToggle provided ──
  const [internalActive, setInternalActive] = useState(active);

  // Use external handler if provided, else fall back to internal state
  const isActive = onToggle ? active : internalActive;

  function handleToggle() {
    if (onToggle) {
      onToggle(!isActive);
    } else {
      setInternalActive((prev) => !prev);
    }
  }

  // ─── Allergy chip ──────────────────────────────────────────────────────────
  if (variant === "allergy") {
    return (
      <div
        className={[
          "flex h-10 shrink-0 items-center gap-1 rounded-full pl-4 pr-3",
          VARIANTS.allergy,
          className,
        ].join(" ")}
      >
        <span className="text-sm font-medium">{label}</span>

        {/* Dismiss button — removes this allergy from the list */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Remove ${label} allergy`}
          className="hover:opacity-70 transition-opacity"
        >
          <span className="material-symbols-outlined text-base text-red-400">
            close
          </span>
        </button>
      </div>
    );
  }

  // ─── Hashtag chip ─────────────────────────────────────────────────────────
  if (variant === "hashtag") {
    return (
      <span
        className={[
          "flex h-8 shrink-0 items-center rounded-full px-3",
          "text-xs font-bold",
          VARIANTS.hashtag,
          className,
        ].join(" ")}
      >
        {label}
      </span>
    );
  }

  // ─── Dietary chip (default) ───────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isActive}
      className={[
        "flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-4",
        "text-sm font-semibold transition-all duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        isActive ? VARIANTS.dietary.active : VARIANTS.dietary.inactive,
        className,
      ].join(" ")}
    >
      {/* Show check icon when active, or a custom icon when provided */}
      {isActive ? (
        <span className="material-symbols-outlined text-sm" aria-hidden="true">
          check_circle
        </span>
      ) : (
        icon && (
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            {icon}
          </span>
        )
      )}
      <span>{label}</span>
    </button>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * ChipPreview — visual test for all Chip variants and states.
 * Usage in App.jsx:
 *   import { ChipPreview } from './components/ui/Chip'
 *   export default function App() { return <ChipPreview /> }
 *
 * @returns {JSX.Element}
 */
export function ChipPreview() {
  // Track which dietary chips are active
  const [preferences, setPreferences] = useState({
    spicy: true,
    vegetarian: false,
    halal: true,
    traditional: false,
  });

  // Track allergy list (dismissible)
  const [allergies, setAllergies] = useState(["Peanuts", "Shellfish"]);

  /** Remove an allergy from the list by name */
  function handleDismiss(name) {
    setAllergies((prev) => prev.filter((a) => a !== name));
  }

  /** Toggle a dietary preference on/off */
  function handleToggle(key, value) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-background-light p-8 flex flex-col gap-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — Chip Component
      </h1>

      {/* ── Dietary Preference Chips ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Dietary Preferences (toggleable)
        </h2>
        <div className="flex flex-wrap gap-3">
          <Chip
            label="Spicy"
            variant="dietary"
            icon="local_fire_department"
            active={preferences.spicy}
            onToggle={(v) => handleToggle("spicy", v)}
          />
          <Chip
            label="Vegetarian"
            variant="dietary"
            active={preferences.vegetarian}
            onToggle={(v) => handleToggle("vegetarian", v)}
          />
          <Chip
            label="Halal"
            variant="dietary"
            active={preferences.halal}
            onToggle={(v) => handleToggle("halal", v)}
          />
          <Chip
            label="Traditional"
            variant="dietary"
            active={preferences.traditional}
            onToggle={(v) => handleToggle("traditional", v)}
          />
          {/* Add new preference button */}
          <Chip label="Add" variant="dietary" icon="add" />
        </div>
      </section>

      {/* ── Allergy Chips ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Allergies (dismissible)
        </h2>
        <div className="flex flex-wrap gap-3">
          {allergies.map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              variant="allergy"
              onDismiss={() => handleDismiss(allergy)}
            />
          ))}
          {/* Show empty state message if all allergies dismissed */}
          {allergies.length === 0 && (
            <p className="text-sm text-[#618968]">No allergies added.</p>
          )}
        </div>
      </section>

      {/* ── Hashtag Chips ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Hashtag Chips (NewPlan screen)
        </h2>
        <div className="flex flex-wrap gap-2">
          <Chip label="#Healthy" variant="hashtag" />
          <Chip label="#Traditional" variant="hashtag" />
          <Chip label="#FastPrep" variant="hashtag" />
          <Chip label="#Budget" variant="hashtag" />
        </div>
      </section>
    </div>
  );
}