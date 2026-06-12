import api from "./api";

const aiService = {
  async generateFromPrompt(planData) {
    const response = await api.post("/ai/generate-from-prompt", {
      user_id: planData.user_id,
      prompt: planData.prompt,
      total_budget: planData.total_budget ?? planData.budget,
      start_date: planData.start_date,
      end_date: planData.end_date,
      cooking_frequency: planData.cooking_frequency || "every_2_days",
    });
    
    // Return the entire response data, not a custom object
    return response.data;
  },
};

export default aiService;