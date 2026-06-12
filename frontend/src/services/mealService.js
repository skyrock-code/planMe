import api from "./api";

const mealService = {
  async getAllMeals() {
    const response = await api.get("/meals/all");
    return response.data;
  },
};

export default mealService;