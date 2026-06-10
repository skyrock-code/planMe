/**
 * @file Button.jsx
 * @description Reusable Button component for the PlanMe app.
 *              Supports multiple variants, sizes, icons, loading state,
 *              and disabled state — all matching the PlanMe design system.
 * @module components/ui
 */

import { useState } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * Tailwind class maps for each button variant.
 * These match the exact colors defined in tailwind.config.js.
 */
const VARIANTS = {
  /** Main call-to-action — solid forest green background with white text */
  primary:
    "bg-primary text-white shadow-lg shadow-black/20 hover:bg-primary-light active:bg-primary-dark",

  /** Secondary action — transparent with green border and text */
  outline:
    "bg-transparent border-2 border-primary text-primary hover:bg-primary/10 active:bg-primary/20",

  /** Subtle action — light gray background, used for "View Recipe" etc. */
  ghost:
    "bg-[#f0f4f1] text-[#111812] dark:bg-white/10 dark:text-white hover:bg-[#e2ebe3] dark:hover:bg-white/20 active:bg-[#d4e3d6]",

  /** Destructive action — red-tinted, used for Logout */
  danger:
    "bg-white dark:bg-[#1a2e1d] border-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100",
};

/**
 * Tailwind class maps for each button size.
 * h = height, px = horizontal padding, text = font size, gap = icon spacing
 */
const SIZES = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-14 px-6 text-lg gap-2",
};

/**
 * Icon size mapped to button size — keeps icons proportional.
 */
const ICON_SIZES = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

// ─── SPINNER ──────────────────────────────────────────────────────────────────

/**
 * Animated SVG spinner shown inside the button during loading state.
 *
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} props.size - Controls spinner dimensions
 * @returns {JSX.Element}
 */
function Spinner({ size }) {
  // Map button size to spinner pixel dimensions
  const dim =
    size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <svg
      className={`${dim} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      {/* Background circle track */}
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      {/* Spinning arc */}
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe Button component.
 *
 * Used across all screens for primary actions (Generate Plan),
 * secondary actions (Edit Plan), subtle actions (View Recipe),
 * and destructive actions (Logout).
 *
 * @component
 * @param {Object}          props
 * @param {React.ReactNode} props.children   - Button label text
 * @param {'primary'|'outline'|'ghost'|'danger'} props.variant - Visual style (default: 'primary')
 * @param {'sm'|'md'|'lg'}  props.size       - Button size (default: 'md')
 * @param {string}          props.icon       - Material Symbol name for left icon (e.g. 'auto_awesome')
 * @param {string}          props.iconRight  - Material Symbol name for right icon (e.g. 'chevron_right')
 * @param {boolean}         props.fullWidth  - Stretch button to full container width
 * @param {boolean}         props.loading    - Show spinner and disable interaction
 * @param {boolean}         props.disabled   - Disable interaction without spinner
 * @param {function}        props.onClick    - Click event handler
 * @param {'button'|'submit'|'reset'} props.type - HTML button type (default: 'button')
 * @param {string}          props.className  - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
}) {
  // Guard: disable the button when loading OR explicitly disabled
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        // Base styles — shared across all variants
        "relative inline-flex items-center justify-center font-bold rounded-full",
        "transition-all duration-150 active:scale-[0.97]",
        // Accessibility: visible focus ring using PlanMe green
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "select-none cursor-pointer",
        // Apply variant and size classes
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        // Optional modifiers
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50 pointer-events-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Show spinner when loading, otherwise show left icon if provided */}
      {loading ? (
        <Spinner size={size} />
      ) : (
        icon && (
          <span
            className={`material-symbols-outlined ${ICON_SIZES[size]}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )
      )}

      {/* Button label */}
      {children && <span>{children}</span>}

      {/* Right icon — hidden during loading to avoid layout shift */}
      {!loading && iconRight && (
        <span
          className={`material-symbols-outlined ${ICON_SIZES[size]}`}
          aria-hidden="true"
        >
          {iconRight}
        </span>
      )}
    </button>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview component — import into App.jsx to test visually.
// DELETE this export before going to production.

/**
 * ButtonPreview — visual test for all Button variants, sizes, and states.
 * Usage in App.jsx:
 *   import { ButtonPreview } from './components/ui/Button'
 *   export default function App() { return <ButtonPreview /> }
 *
 * @returns {JSX.Element}
 */
export function ButtonPreview() {
  // Track loading state for the interactive demo button
  const [loading, setLoading] = useState(false);

  /** Simulates a 2-second async action (e.g. API call) */
  function handleLoadingDemo() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <div className="min-h-screen bg-red-500 p-8 flex flex-col gap-10">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — Button Component
      </h1>

      {/* ── Variants ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Variants
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Generate My Plan</Button>
          <Button variant="outline">Edit Plan</Button>
          <Button variant="ghost">View Recipe</Button>
          <Button variant="danger">Logout</Button>
        </div>
      </section>

      {/* ── With Icons ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          With Icons
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" icon="auto_awesome" size="lg">
            Generate My Plan
          </Button>
          <Button variant="ghost" iconRight="chevron_right" size="md">
            View Recipe
          </Button>
          <Button variant="outline" icon="shopping_cart">
            Grocery List
          </Button>
          <Button variant="primary" icon="add_circle">
            New Plan
          </Button>
        </div>
      </section>

      {/* ── Sizes ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Sizes
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
        </div>
      </section>

      {/* ── Full Width ── */}
      <section className="flex flex-col gap-3 max-w-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Full Width
        </h2>
        <Button variant="primary" size="lg" fullWidth icon="auto_awesome">
          Generate My Plan
        </Button>
        <Button variant="outline" fullWidth>
          Edit Plan
        </Button>
      </section>

      {/* ── States ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          States
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={handleLoadingDemo}
            icon="auto_awesome"
          >
            {loading ? "Generating..." : "Click to Load"}
          </Button>
        </div>
      </section>
    </div>
  );
}