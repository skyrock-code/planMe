import api from "./api";

/**
 * @file groceryService.js
 * @description Grocery List service for the PlanMe app.
 *              Handles all communication with Flask grocery endpoints.
 *
 * Endpoints covered:
 *   GET    /api/grocery/<plan_id>           - Generate + get grocery list
 *   GET    /api/grocery/<plan_id>/saved     - Get saved grocery list
 *   PATCH  /api/grocery/item/<item_id>      - Update item quantity
 *   DELETE /api/grocery/item/<item_id>      - Remove item from list
 *   POST   /api/grocery/<list_id>/add       - Add custom ingredient
 *   GET    /api/grocery/personal/<user_id>  - Get user's saved ingredients
 *   DELETE /api/grocery/personal/item/<id>  - Delete saved ingredient
 * @module services
 */

const groceryService = {

  /**
   * Generates and returns the grocery list for a meal plan.
   * Aggregates all ingredients from all meals in the plan.
   * Calling this multiple times is safe — it regenerates auto items
   * but preserves custom items the user added.
   */

  async generateGroceryList(planId) {
    const response = await api.get(`/grocery/${planId}`);
    return response.data;
  },

  //   * Fetches the saved grocery list without regenerating it.
  async getSavedGroceryList(planId) {
    const response = await api.get(`/grocery/${planId}/saved`);
    return response.data;
  },


  async updateItemQuantity(itemId, quantity) {
    const response = await api.patch(`/grocery/item/${itemId}`, {
      quantity: Number(quantity),
    });
    return response.data;
  },

  async removeItem(itemId) {
    const response = await api.delete(`/grocery/item/${itemId}`);
    return response.data;
  },

    /**
   * Adds a custom ingredient to an existing grocery list.
   * This handles local/traditional ingredients not in the database.
   * Optionally saves the ingredient to the user's personal list for reuse.
   */
   
  async addCustomIngredient(listId, itemData) {
    const response = await api.post(`/grocery/${listId}/add`, {
      name:            itemData.name,
      unit_price:      Number(itemData.unit_price),
      quantity:        Number(itemData.quantity),
      unit:            itemData.unit            || null,
      save_to_profile: itemData.save_to_profile || false,
      user_id:         itemData.user_id         || null,
    });
    return response.data;
  },

  async getPersonalIngredients(userId) {
    const response = await api.get(`/grocery/personal/${userId}`);
    return response.data;
  },

  async deletePersonalIngredient(ingredientId) {
    const response = await api.delete(`/grocery/personal/item/${ingredientId}`);
    return response.data;
  },
};

export default groceryService;
