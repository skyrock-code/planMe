/**
 * @file LoadingSpinner.jsx
 * @description Loading spinner component for async API calls.
 *              Shows a centered animated ring with optional message.
 *              Used on every page that fetches data from the backend.
 * @module components/common
 */

/**
 * LoadingSpinner component.
 *
 * Displays an animated spinning ring centered in its container,
 * with optional loading message below. Can be full-page or inline.
 *
 * @component
 * @param {Object}  props
 * @param {string}  props.message   - Text shown below spinner (default: "Loading...")
 * @param {boolean} props.fullPage  - Fill entire viewport height if true (default: false)
 * @returns {JSX.Element}
 *
 * @example
 * // Full page loading
 * <LoadingSpinner fullPage message="Loading your meal plan..." />
 *
 * @example
 * // Inline loading (inside a card or section)
 * <LoadingSpinner message="Fetching meals..." />
 *
 * @example
 * // No message
 * <LoadingSpinner />
 */
export default function LoadingSpinner({ message = "Loading...", fullPage = false }) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-4
        ${fullPage ? "min-h-screen" : "py-12"}
      `}
    >
      {/* ── Animated Spinner Ring ── */}
      <div className="relative w-12 h-12">
        {/* Outer ring — light gray background */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-200" />

        {/* Inner ring — green spinner with animation */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
      </div>

      {/* ── Loading Message ── */}
      {message && (
        <p className="text-sm text-[#618968] font-medium">{message}</p>
      )}
    </div>
  );
}
