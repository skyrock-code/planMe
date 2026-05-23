import api from "./api";

/**
 * @file authService.js
 * Handles Flask auth endpoints: register and login.
 * Stores JWT token in localStorage after successful login.
 */
const authService = {

  async register(userData) {
    const response = await api.post("/auth/register", {
      username: userData.username,
      email:    userData.email,
      password: userData.password,
      age:      userData.age    || null,
      gender:   userData.gender || null,
    });
    return response.data;
  },

  async login(credentials) {
    const response = await api.post("/auth/login", {
      email:    credentials.email,
      password: credentials.password,
    });
    const { access_token, user_id, username } = response.data;
    // Store token — api.js interceptor reads this on every future request
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify({ user_id, username }));
    return response.data;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },

    /**
   * Returns the currently logged-in user from localStorage.
   * Returns null if no user is logged in.
   *
   * @returns {{user_id: number, username: string} | null}
   */

  getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

     //Checks whether a user is currently logged in.

  isLoggedIn() {
    return Boolean(localStorage.getItem("access_token"));
  },
};

export default authService;
