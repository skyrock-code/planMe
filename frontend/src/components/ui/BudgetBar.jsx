/**
 * @file BudgetBar.jsx
 * @description Reusable BudgetBar component for the PlanMe app.
 *              Displays a visual progress bar showing how much of the
 *              weekly budget has been used, along with remaining amount,
 *              total limit, and an optional savings tip message.
 *              Used on the Dashboard screen's "Weekly Budget" card.
 * @module components/ui
 */

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Formats a number as a locale-friendly FCFA currency string.
 * Example: 15000 → "15,000 FCFA"
 *
 * @param {number} amount - The amount in XAF/FCFA
 * @returns {string}
 */
function formatFCFA(amount) {
  return `${amount.toLocaleString("fr-CM")} FCFA`;
}

/**
 * Determines the progress bar color based on how much budget is remaining.
 * - Green  (primary) : more than 40% remaining — healthy
 * - Yellow (warning) : 20–40% remaining — caution
 * - Red    (danger)  : less than 20% remaining — over budget warning
 *
 * @param {number} percentage - Remaining budget as a percentage (0–100)
 * @returns {string} Tailwind background color class
 */
function getBarColor(percentage) {
  if (percentage > 40) return "bg-primary";
  if (percentage > 20) return "bg-yellow-400";
  return "bg-red-500";
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe BudgetBar component.
 *
 * Used on the Dashboard screen to give users a quick visual summary
 * of their weekly budget status — how much remains, the total limit,
 * and an optional motivational savings tip.
 *
 * @component
 * @param {Object}  props
 * @param {number}  props.spent      - Amount spent so far this week (in FCFA)
 * @param {number}  props.total      - Total weekly budget limit (in FCFA)
 * @param {string}  props.weekLabel  - Week label shown top-right (e.g. "Week 24")
 * @param {string}  props.tip        - Optional savings tip shown below the bar
 * @param {string}  props.className  - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function BudgetBar({
  spent = 0,
  total = 0,
  weekLabel,
  tip,
  className = "",
}) {
  // Calculate remaining amount — clamped at 0 to avoid negative display
  const remaining = Math.max(total - spent, 0);

  // Calculate fill percentage for the progress bar — clamped between 0 and 100
  const remainingPercentage = total > 0
    ? Math.min(Math.round((remaining / total) * 100), 100)
    : 0;

  // Pick bar color based on how much is left
  const barColor = getBarColor(remainingPercentage);

  return (
    <div
      className={[
        "bg-white dark:bg-[#1a2e1d] rounded-xl p-5",
        "shadow-sm border border-gray-50 dark:border-gray-800",
        className,
      ].join(" ")}
    >
      {/* ── Header row — title + week label ── */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#111812] dark:text-white text-lg font-bold leading-tight">
          Weekly Budget
        </h3>
        {weekLabel && (
          <span className="text-primary text-sm font-bold">{weekLabel}</span>
        )}
      </div>

      {/* ── Amount row — remaining (large) + limit (small) ── */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-[#618968] dark:text-primary/70 text-xs font-bold uppercase tracking-wider mb-0.5">
            Remaining
          </p>
          <p className="text-2xl font-bold text-[#111812] dark:text-white">
            {formatFCFA(remaining)}
          </p>
        </div>
        <p className="text-sm text-[#618968] dark:text-white/60 mb-1">
          Limit: {formatFCFA(total)}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div
        className="w-full bg-[#f0f0f0] dark:bg-[#253d28] h-3 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={remainingPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${remainingPercentage}% of budget remaining`}
      >
        <div
          className={`${barColor} h-full rounded-full transition-all duration-500`}
          style={{ width: `${remainingPercentage}%` }}
        />
      </div>

      {/* ── Percentage label ── */}
      <p className="text-xs text-[#618968] dark:text-white/50 mt-1 text-right">
        {remainingPercentage}% remaining
      </p>

      {/* ── Optional savings tip ── */}
      {tip && (
        <div className="mt-4 flex items-center gap-2 text-[#618968] dark:text-primary/80">
          <span className="material-symbols-outlined text-sm" aria-hidden="true">
            info
          </span>
          <p className="text-xs">{tip}</p>
        </div>
      )}
    </div>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * BudgetBarPreview — shows BudgetBar in healthy, caution, and danger states.
 * Usage in App.jsx:
 *   import { BudgetBarPreview } from './components/ui/BudgetBar'
 *   export default function App() { return <BudgetBarPreview /> }
 *
 * @returns {JSX.Element}
 */
export function BudgetBarPreview() {
  return (
    <div className="min-h-screen bg-background-light p-8 flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — BudgetBar Component
      </h1>

      {/* Healthy state — more than 40% remaining */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-2">
          Healthy (66% remaining)
        </p>
        <BudgetBar
          spent={15000}
          total={45000}
          weekLabel="Week 24"
          tip="You've saved 2,500 FCFA compared to last week!"
        />
      </div>

      {/* Caution state — 20–40% remaining */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-2">
          Caution (28% remaining)
        </p>
        <BudgetBar
          spent={32500}
          total={45000}
          weekLabel="Week 24"
          tip="You're approaching your weekly limit."
        />
      </div>

      {/* Danger state — less than 20% remaining */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-2">
          Danger (9% remaining)
        </p>
        <BudgetBar
          spent={41000}
          total={45000}
          weekLabel="Week 24"
          tip="Almost out of budget — consider lighter meals."
        />
      </div>
    </div>
  );
}