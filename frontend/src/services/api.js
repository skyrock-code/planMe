import axios from "axios";

// Get the base URL from environment or use default (LOCAL for development)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { "Content-Type": "application/json" },
  withCredentials: false,
  timeout: 60000, // 60 second timeout
});

// Request interceptor - add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    if (error.response?.status === 400) {
      console.error("Bad request:", error.response.data);
    }
    if (error.response?.status === 500) {
      console.error("Server error:", error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api;