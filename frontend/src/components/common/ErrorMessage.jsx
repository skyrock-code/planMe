/**
 * @file ErrorMessage.jsx
 * @description Error and empty state message component.
 *              Displays user-friendly messages with optional action button.
 *              Supports two visual styles: error (red) and empty (green).
 * @module components/common
 */

import Button from "../ui/Button";

/**
 * Type-based styling configuration.
 * Centralizes all color decisions so they're easy to maintain and update.
 */
const TYPE_STYLES = {
  error: {
    wrapper: "bg-red-50 dark:bg-red-900/20 border border-red-100",
    icon: "text-red-400",
    text: "text-red-600 dark:text-red-400",
    buttonVariant: "ghost",
  },
  empty: {
    wrapper: "bg-primary/5 border border-primary/20",
    icon: "text-primary",
    text: "text-[#618968]",
    buttonVariant: "primary",
  },
};

/**
 * ErrorMessage component.
 *
 * Displays error states, empty states, or network errors with
 * optional action button. Commonly used with API failures and
 * "no data" scenarios on every page.
 *
 * @component
 * @param {Object}   props
 * @param {string}   props.message      - Error or empty state message (required)
 * @param {function} props.onRetry      - Callback for retry button; if not provided, no button shown
 * @param {'error'|'empty'} props.type  - Visual style variant (default: 'error')
 * @param {string}   props.icon         - Material Symbol icon name (default varies by type)
 * @returns {JSX.Element}
 *
 * @example
 * // API failure with retry button
 * <ErrorMessage
 *   message="Failed to load your meal plan. Please try again."
 *   onRetry={refetchMealPlan}
 *   type="error"
 * />
 *
 * @example
 * // Empty state — no meal plans yet
 * <ErrorMessage
 *   message="You have no meal plans yet. Create your first plan!"
 *   type="empty"
 *   icon="restaurant_menu"
 * />
 *
 * @example
 * // Network error without retry
 * <ErrorMessage
 *   message="No internet connection. Please check your network."
 *   type="error"
 * />
 */
export default function ErrorMessage({
  message,
  onRetry,
  type = "error",
  icon = type === "error" ? "error_outline" : "restaurant_menu",
}) {
  const styles = TYPE_STYLES[type] || TYPE_STYLES.error;

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        rounded-xl p-8 ${styles.wrapper}
      `}
    >
      {/* ── Icon ── */}
      <span className={`material-symbols-outlined text-4xl ${styles.icon}`}>
        {icon}
      </span>

      {/* ── Message ── */}
      <p className={`text-center text-sm font-medium ${styles.text}`}>
        {message}
      </p>

      {/* ── Retry Button (conditional) ── */}
      {onRetry && (
        <Button
          variant={styles.buttonVariant}
          size="md"
          onClick={onRetry}
          icon={type === "error" ? "refresh" : "add_circle"}
        >
          {type === "error" ? "Try Again" : "Create Plan"}
        </Button>
      )}
    </div>
  );
}
