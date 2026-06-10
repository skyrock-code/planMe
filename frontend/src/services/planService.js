import api from "./api";

/**
 * @file planService.js
 * Handles all meal plan Flask endpoints.
 * cooking_frequency values: "once_daily" | "twice_daily" |
 * "every_2_days" | "every_3_days" | "flexible"
 */
const planService = {

  /**
   * Generate meals for an existing plan using the AI endpoint.
   * Replaces any previously assigned meals with AI-selected ones.
   * Falls back to rule-based selection when HF_TOKEN is absent.
   * @param {{ plan_id: number, prompt: string }} params
   */
  async generateAIPlan({ plan_id, prompt }) {
    const response = await api.post("/ai/generate-plan", { plan_id, prompt });
    return response.data;
  },

  async createPlan(planData) {
    const response = await api.post("/meal_plan/generate", {
      user_id:           planData.user_id,
      start_date:        planData.start_date,
      end_date:          planData.end_date,
      total_budget:      planData.budget,
      cooking_frequency: planData.cooking_frequency || "every_2_days",
    });
    return response.data;
  },

  async getUserPlans(userId) {
    const response = await api.get(`/meal_plan/user/${userId}`);
    return response.data;
  },

  async getPlanMeals(planId) {
    const response = await api.get(`/meal_plan/${planId}/meals`);
    return response.data;
  },

  async assignMeal(assignment) {
    const response = await api.post("/meal_plan/assign", {
      plan_id:       assignment.plan_id,
      meal_id:       assignment.meal_id,
      start_date:    assignment.start_date,
      duration_days: assignment.duration_days,
    });
    return response.data;
  },

  async swapMeal(swapData) {
    const response = await api.put("/meal_plan/swap", {
      plan_id:     swapData.plan_id,
      old_meal_id: swapData.old_meal_id,
      new_meal_id: swapData.new_meal_id,
      start_date:  swapData.start_date,
    });
    return response.data;
  },

  async deletePlan(planId) {
    const response = await api.delete(`/meal_plan/${planId}`);
    return response.data;
  },
};

export default planService;
