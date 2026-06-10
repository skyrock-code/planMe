/**
 * @file groceryService.js
 * @description API service layer for all grocery list operations.
 *              Separates data fetching from regeneration so manual
 *              edits are never accidentally overwritten.
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api",
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const groceryService = {
  /**
   * Fetch existing grocery list WITHOUT regenerating from meals.
   * This is the default load on every page visit — preserves manual edits.
   * Returns 404 if no list has been generated yet.
   */
  async fetchList(planId) {
    const res = await api.get(`/grocery/${planId}/saved`);
    return res.data;
  },

  /**
   * Generate (or regenerate) the grocery list from meal ingredients.
   * Overwrites all auto-generated items — custom items are preserved.
   * Call only on first load (404 from fetchList) or explicit user request.
   */
  async generateList(planId) {
    const res = await api.get(`/grocery/${planId}`);
    return res.data;
  },

  /**
   * Update a single grocery list item.
   * Pass exactly one of:
   *   { quantity }    — recalculates total_price server-side
   *   { total_price } — recalculates quantity server-side
   * unit_price is never changed here; the server reads it from the DB.
   * Returns { item_id, quantity, total_price, list_total }.
   * @param {number} itemId
   * @param {{ quantity?: number, total_price?: number }} updates
   */
  async updateItem(itemId, updates) {
    const res = await api.patch(`/grocery/item/${itemId}`, updates);
    return res.data;
  },

  /**
   * Remove a single item from the grocery list.
   * @param {number} itemId
   */
  async removeItem(itemId) {
    const res = await api.delete(`/grocery/item/${itemId}`);
    return res.data;
  },

  /**
   * Add an ingredient to the grocery list.
   *
   * Two modes:
   * - DB ingredient: pass { ingredient_id, quantity }
   * - Custom item:   pass { name, unit, unit_price, quantity }
   *
   * @param {number} listId
   * @param {object} payload
   */
  async addIngredient(listId, payload) {
    const res = await api.post(`/grocery/${listId}/add`, payload);
    return res.data;
  },

  /**
   * Toggle the "always at home" flag on a single grocery list item.
   * The server flips the boolean, recalculates the list total,
   * and returns the new state.
   * @param {number} itemId
   */
  async toggleAlwaysAtHome(itemId) {
    const res = await api.patch(`/grocery/item/${itemId}/toggle-home`);
    return res.data;
  },

  /**
   * Search the ingredients database by name.
   * Returns up to 10 matching ingredients with unit and price.
   * @param {string} query — minimum 2 characters
   */
  async searchIngredients(query) {
    const res = await api.get(`/ingredients/search`, {
      params: { q: query },
    });
    return res.data;
  },

  /**
   * Reset the 7-plan counter for an always-at-home ingredient.
   * Call when user confirms they still have the ingredient.
   * @param {string} ingredientName
   */
  async resetAtHomeCounter(ingredientName) {
    const res = await api.post(`/grocery/reset-at-home/${encodeURIComponent(ingredientName)}`);
    return res.data;
  },

  /**
   * Remove an ingredient from the user's always-at-home list.
   * Call when user confirms they no longer have it at home.
   * @param {string} ingredientName
   */
  async removeFromAtHome(ingredientName) {
    const res = await api.delete(`/grocery/remove-at-home/${encodeURIComponent(ingredientName)}`);
    return res.data;
  },
};

export default groceryService;