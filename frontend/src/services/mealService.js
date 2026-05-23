import api from "./api";

/**
 * @file mealService.js
 * Fetches all available meals from the database.
 * Used by WeekPlan for the meal swap feature.
 */
const mealService = {

  async getAllMeals() {
    const response = await api.get("/meals/all");
    return response.data;
  },
};

export default mealService;
