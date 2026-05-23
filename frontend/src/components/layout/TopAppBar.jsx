/**
 * @file TopAppBar.jsx
 * @description Reusable sticky top navigation bar for the PlanMe app.
 *              Appears on all screens except the Dashboard (which has its own header).
 *              Supports a back button on the left, a centered title,
 *              and an optional action icon on the right (e.g. edit, calendar).
 * @module components/layout
 */

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe TopAppBar component.
 *
 * Used on:
 * - Login/Signup  : back chevron + "Welcome" title
 * - NewPlan       : back arrow + "Create New Plan" title
 * - WeekPlan      : profile avatar + title + calendar icon
 * - Profile       : back arrow + "Profile & Settings" title + edit icon
 * - GroceryList   : back arrow + "Grocery List" title
 *
 * @component
 * @param {Object}        props
 * @param {string}        props.title         - Text displayed in the center of the bar
 * @param {boolean}       props.showBack      - Show the back button on the left (default: true)
 * @param {string}        props.backIcon      - Material Symbol name for back button (default: 'arrow_back_ios_new')
 * @param {function}      props.onBack        - Called when the back button is pressed
 * @param {string}        props.rightIcon     - Material Symbol name for optional right action icon
 * @param {function}      props.onRightAction - Called when the right icon is pressed
 * @param {string}        props.avatarUrl     - If provided, shows a circular avatar instead of back button
 * @param {string}        props.subtitle      - Small text shown below the title (e.g. date range)
 * @param {string}        props.className     - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function TopAppBar({
  title,
  showBack = true,
  backIcon = "arrow_back_ios_new",
  onBack,
  rightIcon,
  onRightAction,
  avatarUrl,
  subtitle,
  className = "",
}) {
  return (
    <header
      className={[
        // Sticky so it stays visible while the page scrolls
        "sticky top-0 z-50",
        "flex items-center justify-between",
        "bg-white/90 dark:bg-background-dark/90 backdrop-blur-md",
        "border-b border-gray-100 dark:border-white/10",
        "px-4 py-3",
        className,
      ].join(" ")}
    >
      {/* ── LEFT SIDE — back button or avatar ── */}
      <div className="w-12 flex items-center justify-start">
        {avatarUrl ? (
          /* Profile avatar — used on WeekPlan screen */
          <div
            className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-primary"
            style={{ backgroundImage: `url(${avatarUrl})` }}
            role="img"
            aria-label="User profile picture"
          />
        ) : showBack ? (
          /* Back navigation button */
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[#111812] dark:text-white">
              {backIcon}
            </span>
          </button>
        ) : (
          /* Empty spacer to keep title centered when no left element */
          <div className="w-10" />
        )}
      </div>

      {/* ── CENTER — title and optional subtitle ── */}
      <div className="flex flex-col items-center flex-1">
        <h2 className="text-[#111812] dark:text-white text-lg font-bold leading-tight tracking-tight text-center">
          {title}
        </h2>
        {/* Subtitle shown on WeekPlan (date range) */}
        {subtitle && (
          <p className="text-xs text-[#618968] dark:text-primary/70 font-medium mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── RIGHT SIDE — optional action icon ── */}
      <div className="w-12 flex items-center justify-end">
        {rightIcon ? (
          <button
            type="button"
            onClick={onRightAction}
            aria-label={`Action: ${rightIcon}`}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f0f4f1] dark:bg-white/10 hover:bg-[#e2ebe3] dark:hover:bg-white/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[#111812] dark:text-white">
              {rightIcon}
            </span>
          </button>
        ) : (
          /* Empty spacer to keep title perfectly centered */
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * TopAppBarPreview — visual test showing all TopAppBar configurations.
 * Usage in App.jsx:
 *   import { TopAppBarPreview } from './components/layout/TopAppBar'
 *   export default function App() { return <TopAppBarPreview /> }
 *
 * @returns {JSX.Element}
 */
export function TopAppBarPreview() {
  return (
    <div className="min-h-screen bg-background-light flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[#111812] px-8 pt-8">
        PlanMe — TopAppBar Component
      </h1>

      {/* Login screen style */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] px-8">
          Login screen — back + title only
        </p>
        <TopAppBar
          title="Welcome"
          backIcon="chevron_left"
          onBack={() => alert("Back pressed")}
        />
      </div>

      {/* NewPlan screen style */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] px-8">
          NewPlan screen — back arrow + title
        </p>
        <TopAppBar
          title="Create New Plan"
          onBack={() => alert("Back pressed")}
        />
      </div>

      {/* WeekPlan screen style */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] px-8">
          WeekPlan screen — avatar + title + subtitle + calendar icon
        </p>
        <TopAppBar
          title="Weekly Meal Plan"
          subtitle="October 23 - 29, 2025"
          avatarUrl="https://i.pravatar.cc/40"
          rightIcon="calendar_month"
          onRightAction={() => alert("Calendar pressed")}
        />
      </div>

      {/* Profile screen style */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#618968] px-8">
          Profile screen — back + title + edit icon
        </p>
        <TopAppBar
          title="Profile & Settings"
          onBack={() => alert("Back pressed")}
          rightIcon="edit"
          onRightAction={() => alert("Edit pressed")}
        />
      </div>
    </div>
  );
}