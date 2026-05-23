/**
 * @file ServingsCounter.jsx
 * @description Reusable ServingsCounter component for the PlanMe app.
 *              A +/- stepper widget used on the Profile screen to set
 *              default servings, and on the NewPlan screen for per-plan servings.
 *              Enforces a minimum and optional maximum value.
 * @module components/ui
 */

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe ServingsCounter component.
 *
 * Used on:
 * - Profile screen  : set default number of servings per household
 * - NewPlan screen  : override servings for a specific meal plan
 *
 * @component
 * @param {Object}    props
 * @param {number}    props.value      - Current servings count (controlled)
 * @param {function}  props.onChange   - Called with the new value when +/- is pressed
 * @param {number}    props.min        - Minimum allowed value (default: 1)
 * @param {number}    props.max        - Maximum allowed value (default: 20)
 * @param {string}    props.label      - Label shown above the counter (optional)
 * @param {string}    props.helper     - Helper text shown below (optional)
 * @param {string}    props.className  - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function ServingsCounter({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
  helper,
  className = "",
}) {
  /** Decrease count — clamped at min */
  function handleDecrement() {
    if (value > min) onChange(value - 1);
  }

  /** Increase count — clamped at max */
  function handleIncrement() {
    if (value < max) onChange(value + 1);
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>

      {/* ── Optional label ── */}
      {label && (
        <p className="text-lg font-bold text-[#111812] dark:text-white leading-tight">
          {label}
        </p>
      )}

      {/* ── Counter row — minus, value display, plus ── */}
      <div className="flex items-center justify-between bg-background-light dark:bg-background-dark rounded-full px-4 py-2">

        {/* Decrement button — grayed out at minimum */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label="Decrease servings"
          className={[
            "w-10 h-10 flex items-center justify-center rounded-full",
            "bg-white dark:bg-[#2c4230] shadow-sm",
            "transition-all duration-150",
            value <= min
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-gray-100 dark:hover:bg-[#3a5238] active:scale-95",
          ].join(" ")}
        >
          <span className="material-symbols-outlined text-[#618968] dark:text-white">
            remove
          </span>
        </button>

        {/* Current value display */}
        <div className="flex items-baseline gap-1 select-none">
          <span className="text-xl font-bold text-[#111812] dark:text-white">
            {value}
          </span>
          <span className="text-sm text-gray-400">
            {value === 1 ? "serving" : "servings"}
          </span>
        </div>

        {/* Increment button — grayed out at maximum */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label="Increase servings"
          className={[
            "w-10 h-10 flex items-center justify-center rounded-full",
            "bg-primary text-white shadow-sm",
            "transition-all duration-150",
            value >= max
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-[#22d940] active:scale-95",
          ].join(" ")}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* ── Optional helper text ── */}
      {helper && (
        <p className="text-xs text-gray-400 px-2">{helper}</p>
      )}
    </div>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * ServingsCounterPreview — interactive test for the ServingsCounter.
 * Usage in App.jsx:
 *   import { ServingsCounterPreview } from './components/ui/ServingsCounter'
 *   export default function App() { return <ServingsCounterPreview /> }
 *
 * @returns {JSX.Element}
 */
import { useState } from "react";

export function ServingsCounterPreview() {
  const [profileServings, setProfileServings] = useState(2);
  const [planServings, setPlanServings]       = useState(1);

  return (
    <div className="min-h-screen bg-background-light p-8 flex flex-col gap-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — ServingsCounter Component
      </h1>

      {/* Profile screen usage */}
      <section className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968] mb-4">
          Profile Screen
        </h2>
        <ServingsCounter
          label="Default Servings"
          helper="Average number of people per meal"
          value={profileServings}
          onChange={setProfileServings}
          min={1}
          max={10}
        />
      </section>

      {/* NewPlan screen usage */}
      <section className="bg-white dark:bg-[#1a2e1d] rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968] mb-4">
          NewPlan Screen
        </h2>
        <ServingsCounter
          label="Number of Servings"
          helper="How many people are you cooking for?"
          value={planServings}
          onChange={setPlanServings}
          min={1}
          max={20}
        />
      </section>
    </div>
  );
}