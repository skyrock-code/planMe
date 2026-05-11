import { Routes, Route } from 'react-router-dom'

// Page imports (placeholders for now)
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NewPlan from './pages/NewPlan'
import WeekPlan from './pages/WeekPlan'
import Profile from './pages/Profile'
import GroceryList from './pages/GroceryList'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/new-plan"  element={<NewPlan />} />
      <Route path="/week-plan" element={<WeekPlan />} />
      <Route path="/profile"   element={<Profile />} />
      <Route path="/grocery"   element={<GroceryList />} />
    </Routes>
  )
}