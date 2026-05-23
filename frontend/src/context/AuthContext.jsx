import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

/**
 * @file AuthContext.jsx
 * Global auth state for PlanMe.
 * Provides: user, login, register, logout, isLoggedIn.
 * Restores session from localStorage on app load.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on first load — prevents wrong screen flash
  useEffect(() => {
    const existingUser = authService.getCurrentUser();
    if (existingUser) setUser(existingUser);
    setLoading(false);
  }, []);

  async function login(credentials) {
    const data = await authService.login(credentials);
    setUser({ user_id: data.user_id, username: data.username });
    navigate("/dashboard");
  }

  async function register(userData) {
    await authService.register(userData);
    // Auto-login after registration
    await login({ email: userData.email, password: userData.password });
  }

  function logout() {
    authService.logout();
    setUser(null);
    navigate("/");
  }

  function isLoggedIn() {
    return Boolean(user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isLoggedIn }}>
      {/* Don't render until auth check is done — prevents wrong screen flash */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export default AuthContext;
