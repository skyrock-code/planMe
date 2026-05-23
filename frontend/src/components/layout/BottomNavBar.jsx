/**
 * @file BottomNavBar.jsx
 * @description Fixed bottom navigation bar for the PlanMe app.
 *              Appears on Dashboard, WeekPlan, Profile, and GroceryList screens.
 *              Highlights the active tab and triggers navigation on press.
 * @module components/layout
 */

import { useNavigate, useLocation } from "react-router-dom";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

/**
 * Navigation tab definitions.
 * Each tab has a label, Material Symbol icon name, and its route path.
 * The `activePaths` array lets multiple routes highlight the same tab.
 */
const NAV_TABS = [
  {
    label: "Home",
    icon: "home",
    path: "/dashboard",
    activePaths: ["/dashboard"],
  },
  {
    label: "Plans",
    icon: "calendar_month",
    path: "/week-plan",
    activePaths: ["/week-plan", "/new-plan"],
  },
  {
    label: "Grocery",
    icon: "shopping_cart",
    path: "/grocery",
    activePaths: ["/grocery"],
  },
  {
    label: "Profile",
    icon: "person",
    path: "/profile",
    activePaths: ["/profile"],
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe BottomNavBar component.
 *
 * Fixed to the bottom of the screen on all main app screens.
 * Uses React Router's useLocation to determine which tab is active,
 * and useNavigate to handle tab switching.
 *
 * Tabs:
 * - Home     → /dashboard
 * - Plans    → /week-plan  (also active on /new-plan)
 * - Grocery  → /grocery
 * - Profile  → /profile
 *
 * @component
 * @returns {JSX.Element}
 */
export default function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className={[
        // Fixed to viewport bottom, full width
        "fixed bottom-0 left-0 right-0 z-50",
        // Frosted glass background effect
        "bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg",
        "border-t border-black/5 dark:border-white/5",
        // Horizontal layout with safe area padding for iOS home indicator
        "flex justify-around items-center",
        "px-6 pt-3 pb-6",
      ].join(" ")}
      aria-label="Main navigation"
    >
      {NAV_TABS.map((tab) => {
        // Determine if this tab is currently active based on the URL path
        const isActive = tab.activePaths.includes(location.pathname);

        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={isActive ? "page" : undefined}
            className={[
              "flex flex-col items-center gap-1",
              "transition-colors duration-150",
              // Active tab uses primary green, inactive uses muted gray
              isActive
                ? "text-primary"
                : "text-[#618968] dark:text-white/60 hover:text-primary/70",
            ].join(" ")}
          >
            {/* Tab icon — filled style when active for visual emphasis */}
            <span
              className="material-symbols-outlined text-[28px]"
              style={{
                fontVariationSettings: isActive
                  ? "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24"
                  : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
              }}
            >
              {tab.icon}
            </span>

            {/* Tab label — bold when active */}
            <span
              className={`text-[10px] ${
                isActive ? "font-bold" : "font-medium"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// Note: BottomNavBar uses React Router hooks, so BrowserRouter must wrap it.
// It's already wrapped in main.jsx so just drop it into App.jsx directly.
// DELETE this export before production.

/**
 * BottomNavBarPreview — renders the nav bar with a simulated active state.
 * Visit different routes (e.g. /dashboard, /profile) to see active tab change.
 * Usage in App.jsx:
 *   import BottomNavBar from './components/layout/BottomNavBar'
 *   export default function App() {
 *     return (
 *       <div className="min-h-screen bg-background-light">
 *         <p className="p-8 text-lg font-bold">Navigate using the bar below</p>
 *         <BottomNavBar />
 *       </div>
 *     )
 *   }
 *
 * @returns {JSX.Element}
 */
export function BottomNavBarPreview() {
  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-[#111812] mb-2">
          PlanMe — BottomNavBar Component
        </h1>
        <p className="text-[#618968]">
          Click the tabs below to navigate between routes.
          The active tab highlights in green.
        </p>
      </div>
      {/* The real BottomNavBar — reads current route automatically */}
      <BottomNavBar />
    </div>
  );
}