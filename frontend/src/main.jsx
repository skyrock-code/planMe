/**
 * @file main.jsx
 * @description Application entry point for PlanMe.
 *              Sets up React, React Router, and the Auth context.
 *              Order matters:
 *              1. BrowserRouter must wrap everything (Router context)
 *              2. AuthProvider must be inside BrowserRouter (needs useNavigate)
 *              3. App renders the route tree inside AuthProvider
 * @module root
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
     {/* BrowserRouter provides routing context to the whole app */}
    <BrowserRouter>
    {/* AuthProvider provides user state and auth functions to all pages */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)