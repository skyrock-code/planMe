import axios from "axios";

/**
 * @file api.js
 * Central Axios instance for all PlanMe API calls.
 * Automatically attaches JWT token to every request.
 * Automatically handles 401 token expiry.
 */

/**
 * Pre-configured Axios instance pointing to the Flask backend.
 * Base URL is read from the .env file:
 *   VITE_API_URL=https://planme-backend-kgl6.onrender.com/api
 *
 * Falls back to localhost:5000 if the env variable is not set.
 */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every outgoing request
api.interceptors.request.use((config) => {
  // Read token from localStorage on every request (stays fresh after login)
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expiry globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;