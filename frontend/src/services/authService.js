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

  /**
   * Fetches the full profile of the logged-in user.
   * Requires a valid JWT token in localStorage.
   * @returns {Promise<Object>} Full user profile including diets/allergies
   */
  async getProfile() {
    const response = await api.get("/auth/profile");
    return response.data;
  },

  /**
   * Updates the profile of the logged-in user.
   * Only fields included in the object will be updated.
   * @param {Object} profileData - Partial profile fields to update
   * @returns {Promise<{message: string}>}
   */
  async updateProfile(profileData) {
    const response = await api.put("/auth/profile", profileData);
    return response.data;
  },

  // ── Allergy management ────────────────────────────────

  /**
   * Fetches all allergies for the logged-in user.
   * @returns {Promise<Array<{id: number, allergen: string}>>}
   */
  async getAllergies() {
    const response = await api.get('/auth/user/allergies')
    return response.data
  },

  /**
   * Adds a new allergen to the user's allergy list.
   * @param {string} allergen - e.g. "peanuts"
   * @returns {Promise<{message: string, id: number, allergen: string}>}
   */
  async addAllergy(allergen) {
    const response = await api.post('/auth/user/allergies', {
      allergen: allergen.trim().toLowerCase()
    })
    return response.data
  },

  /**
   * Removes an allergy by its database ID.
   * @param {number} allergyId - The UserAllergy record ID
   * @returns {Promise<{message: string}>}
   */
  async deleteAllergy(allergyId) {
    const response = await api.delete(`/auth/user/allergies/${allergyId}`)
    return response.data
  },

  // ── Diet preference management ────────────────────────

  /**
   * Fetches all dietary preferences for the logged-in user.
   * @returns {Promise<Array<{id: number, diet_type: string}>>}
   */
  async getDiets() {
    const response = await api.get('/auth/user/diets')
    return response.data
  },

  /**
   * Adds a new dietary preference.
   * @param {string} dietType - e.g. "spicy", "traditional", "halal"
   * @returns {Promise<{message: string, id: number, diet_type: string}>}
   */
  async addDiet(dietType) {
    const response = await api.post('/auth/user/diets', {
      diet_type: dietType.trim().toLowerCase()
    })
    return response.data
  },

  /**
   * Removes a dietary preference by its database ID.
   * @param {number} dietId - The UserDiet record ID
   * @returns {Promise<{message: string}>}
   */
  async deleteDiet(dietId) {
    const response = await api.delete(`/auth/user/diets/${dietId}`)
    return response.data
  },
};

export default authService;
