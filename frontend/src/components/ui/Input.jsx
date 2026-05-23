/**
 * @file Input.jsx
 * @description Reusable Input component for the PlanMe app.
 *              Supports text, password, number, and textarea types.
 *              Includes left icon, right icon (password toggle),
 *              label, helper text, error state, and two shape variants
 *              (rounded-full for Login, rounded-xl for NewPlan/Profile).
 * @module components/ui
 */

import { useState } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * Shape variants for the input field.
 *
 * - 'pill'  : rounded-full — used on the Login / Signup screen
 * - 'box'   : rounded-xl  — used on NewPlan and Profile screens
 */
const SHAPES = {
  pill: "rounded-full px-12",
  box: "rounded-xl px-4",
};

/**
 * Base Tailwind classes shared by all input variants.
 * Handles sizing, border, background, focus ring, and dark mode.
 */
const BASE_INPUT =
  "w-full h-14 text-base font-normal text-[#111812] dark:text-white " +
  "bg-white dark:bg-white/5 " +
  "border border-[#dbe6dd] dark:border-white/10 " +
  "placeholder:text-[#618968]/60 " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent " +
  "transition-all duration-150";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe Input component.
 *
 * Covers all input use cases across the app:
 * - Login/Signup  : email, password (with show/hide toggle), full name
 * - NewPlan       : budget (number + FCFA suffix), servings (number)
 * - Profile       : weekly budget (with FCFA suffix)
 *
 * @component
 * @param {Object}   props
 * @param {string}   props.label        - Label text shown above the input
 * @param {string}   props.placeholder  - Placeholder text inside the input
 * @param {'text'|'password'|'number'|'email'|'textarea'} props.type - Input type (default: 'text')
 * @param {'pill'|'box'} props.shape    - Visual shape (default: 'pill')
 * @param {string}   props.icon         - Material Symbol name for left icon (e.g. 'mail')
 * @param {string}   props.suffix       - Text shown on the right side (e.g. 'FCFA')
 * @param {string}   props.helper       - Helper text shown below the input
 * @param {string}   props.error        - Error message (replaces helper text, turns red)
 * @param {string}   props.value        - Controlled value
 * @param {function} props.onChange     - Change handler
 * @param {boolean}  props.disabled     - Disables the input
 * @param {string}   props.className    - Extra Tailwind classes for overrides
 * @param {string}   props.id           - HTML id (auto-generated from label if omitted)
 * @returns {JSX.Element}
 */
export default function Input({
  label,
  placeholder,
  type = "text",
  shape = "pill",
  icon,
  suffix,
  helper,
  error,
  value,
  onChange,
  disabled = false,
  className = "",
  id,
  min,
  rows = 4,
}) {
  // Track password visibility for the show/hide toggle
  const [showPassword, setShowPassword] = useState(false);

  // Generate a fallback id from the label if none is provided
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-") ?? "input";

  // Resolve the actual HTML input type
  // Password fields toggle between 'password' and 'text'
  const resolvedType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  // Determine padding — adjust right padding when suffix or password toggle is present
  const hasSuffix = Boolean(suffix);
  const isPassword = type === "password";
  const hasRightElement = hasSuffix || isPassword;

  // Left padding: add space for the icon if one is provided
  const leftPadding = icon
    ? shape === "pill"
      ? "pl-12"
      : "pl-12"
    : shape === "pill"
    ? "pl-6"
    : "pl-4";

  // Right padding: add space for suffix or password eye icon
  const rightPadding = hasRightElement
    ? shape === "pill"
      ? "pr-14"
      : "pr-14"
    : shape === "pill"
    ? "pr-6"
    : "pr-4";

  // Apply error styling to border when error message exists
  const errorBorder = error
    ? "border-red-400 dark:border-red-500 focus:ring-red-400"
    : "";

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>

      {/* ── Label ── */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-[#111812] dark:text-white pl-1"
        >
          {label}
        </label>
      )}

      {/* ── Input wrapper — positions icon and suffix absolutely ── */}
      <div className="relative w-full flex items-stretch">

        {/* Left icon — shown inside the input on the left */}
        {icon && (
          <span
            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#618968] pointer-events-none z-10"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}

        {/* ── Textarea variant ── */}
        {type === "textarea" ? (
          <textarea
            id={inputId}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={[
              BASE_INPUT,
              "rounded-xl px-4 py-4 resize-none leading-relaxed",
              icon ? "pl-12" : "pl-4",
              errorBorder,
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ) : (
          /* ── Standard input (text, password, number, email) ── */
          <input
            id={inputId}
            type={resolvedType}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            className={[
              BASE_INPUT,
              // Apply shape-specific horizontal padding base
              shape === "pill" ? "rounded-full" : "rounded-xl",
              // Apply calculated left/right padding
              leftPadding,
              // Only apply right padding if no suffix (suffix handles it)
              !hasSuffix ? rightPadding : "pr-4",
              // Suffix gets its own border attached on the right, so square off this side
              hasSuffix ? "rounded-r-none border-r-0" : "",
              errorBorder,
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        )}

        {/* ── FCFA / text suffix (e.g. budget fields) ── */}
        {suffix && (
          <div
            className={[
              "flex items-center justify-center px-4",
              "border border-[#dbe6dd] dark:border-white/10 border-l-0",
              "bg-gray-50 dark:bg-white/10",
              "text-[#111812] dark:text-white font-bold text-sm",
              shape === "pill" ? "rounded-r-full" : "rounded-r-xl",
            ].join(" ")}
          >
            {suffix}
          </div>
        )}

        {/* ── Password visibility toggle ── */}
        {isPassword && !suffix && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#618968] hover:text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className="material-symbols-outlined">
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </button>
        )}
      </div>

      {/* ── Helper or error text below the input ── */}
      {(helper || error) && (
        <p
          className={`text-xs pl-1 ${
            error
              ? "text-red-500 dark:text-red-400"
              : "text-[#618968] dark:text-gray-400"
          }`}
        >
          {/* Show error message if present, otherwise show helper */}
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview component — import into App.jsx to test all input styles.
// DELETE this export before going to production.

/**
 * InputPreview — visual test for all Input variants and states.
 * Usage in App.jsx:
 *   import { InputPreview } from './components/ui/Input'
 *   export default function App() { return <InputPreview /> }
 *
 * @returns {JSX.Element}
 */
export function InputPreview() {
  // Controlled state for interactive inputs
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [budget, setBudget]     = useState("");
  const [servings, setServings] = useState("1");
  const [prompt, setPrompt]     = useState("");

  return (
    <div className="min-h-screen bg-background-light p-8 flex flex-col gap-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — Input Component
      </h1>

      {/* ── Login Screen Inputs (pill shape) ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Login Screen (pill shape)
        </h2>

        <Input
          label="Full Name"
          placeholder="Enter your full name"
          type="text"
          shape="pill"
          icon="person"
        />

        <Input
          label="Email or Phone Number"
          placeholder="Enter your email or phone"
          type="email"
          shape="pill"
          icon="mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          type="password"
          shape="pill"
          icon="lock"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </section>

      {/* ── NewPlan Screen Inputs (box shape) ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          New Plan Screen (box shape)
        </h2>

        <Input
          label="Estimated Budget"
          placeholder="e.g. 5000"
          type="number"
          shape="box"
          suffix="FCFA"
          helper="Enter your budget for the entire duration."
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          min="0"
        />

        <Input
          label="Number of Servings"
          placeholder="e.g. 2"
          type="number"
          shape="box"
          helper="How many people are you cooking for?"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          min="1"
        />

        <Input
          label="Meal Preferences"
          placeholder="I want something with Ndolé or Achu for lunch..."
          type="textarea"
          helper="Describe what you feel like eating."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
        />
      </section>

      {/* ── States ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          States
        </h2>

        <Input
          label="Disabled Input"
          placeholder="Cannot type here"
          shape="pill"
          icon="lock"
          disabled
        />

        <Input
          label="Input with Error"
          placeholder="Enter your email"
          type="email"
          shape="pill"
          icon="mail"
          error="Please enter a valid email address."
        />

        <Input
          label="Weekly Budget"
          placeholder="50,000"
          type="text"
          shape="box"
          suffix="FCFA"
          helper="Approx. 7,150 FCFA per day"
        />
      </section>
    </div>
  );
}