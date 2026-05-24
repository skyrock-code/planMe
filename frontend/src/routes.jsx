/**
 * @file routes.jsx
 * @description Central routing configuration for the PlanMe app.
 *              Defines all client-side routes using React Router DOM.
 *              Maps URL paths to their corresponding page components.
 *
 *              Route structure:
 *              /             → Login (entry point)
 *              /dashboard    → Dashboard (home screen)
 *              /new-plan     → NewPlan (plan creation form)
 *              /week-plan    → WeekPlan (generated plan view)
 *              /grocery      → GroceryList (shopping list)
 *              /profile      → Profile (user settings)
 *
 *              Protected routes will be added in Phase 4
 *              when JWT authentication is integrated.
 * @module routes
 */

import { Routes, Route } from "react-router-dom";

// ─── PAGE IMPORTS ─────────────────────────────────────────────────────────────
// Note: filenames must match EXACTLY (case-sensitive) to avoid Vite import errors.

import Login       from "./pages/Login";
import Dashboard   from "./pages/Dashboard";
import NewPlan     from "./pages/NewPlan";
import WeekPlan    from "./pages/WeekPlan";
import GroceryList from "./pages/GroceryList";
import Profile     from "./pages/Profile";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * AppRoutes component.
 *
 * Renders the full client-side routing tree.
 * Wrapped by BrowserRouter in main.jsx.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth screen — default entry point */}
      <Route path="/"           element={<Login />}       />

      {/* Main app screens */}
      <Route path="/dashboard"     element={<Dashboard />}   />
      <Route path="/new-plan"      element={<NewPlan />}     />
      <Route path="/week-plan/:planId" element={<WeekPlan />}    />
      <Route path="/week-plan"     element={<WeekPlan />}    />
      <Route path="/grocery/:planId" element={<GroceryList />} />
      <Route path="/grocery"       element={<GroceryList />} />
      <Route path="/profile"       element={<Profile />}     />

      {/* 
        TODO Phase 4: Add a catch-all 404 route
        <Route path="*" element={<NotFound />} />
      */}
    </Routes>
  );
}