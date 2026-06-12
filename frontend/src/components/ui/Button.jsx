/**
 * @file Button.jsx
 * @description Reusable Button component for the PlanMe app.
 *              Supports multiple variants, sizes, icons (Lucide React), loading state,
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
  primary:
    "bg-primary text-white shadow-lg shadow-black/20 hover:bg-primary-light active:bg-primary-dark",

  outline:
    "bg-transparent border-2 border-primary text-primary hover:bg-primary/10 active:bg-primary/20",

  ghost:
    "bg-[#f0f4f1] text-[#111812] dark:bg-white/10 dark:text-white hover:bg-[#e2ebe3] dark:hover:bg-white/20 active:bg-[#d4e3d6]",

  danger:
    "bg-white dark:bg-[#1a2e1d] border-2 border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100",
};

const SIZES = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-14 px-6 text-lg gap-2",
};

const ICON_SIZES = {
  sm: 16,
  md: 20,
  lg: 24,
};

// ─── SPINNER ──────────────────────────────────────────────────────────────────

function Spinner({ size }) {
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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

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
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={[
        "relative inline-flex items-center justify-center font-bold rounded-full",
        "transition-all duration-150 active:scale-[0.97]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "select-none cursor-pointer",
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? "w-full" : "",
        isDisabled ? "opacity-50 pointer-events-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        icon && <span className="inline-flex items-center justify-center">{icon}</span>
      )}

      {children && <span>{children}</span>}

      {!loading && iconRight && (
        <span className="inline-flex items-center justify-center">{iconRight}</span>
      )}
    </button>
  );
}
