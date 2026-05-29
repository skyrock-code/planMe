/**
 * @file mealDescriptions.js
 * @description Short descriptions for all 32 Cameroonian meals
 * @module utils
 */

export const MEAL_DESCRIPTIONS = {
  1: "A traditional Cameroonian dish made with cocoyam and yellow sauce. Rich and comforting.",
  2: "Hearty beans served with fried plantains. A protein-packed meal that's both filling and affordable.",
  3: "Canda sauce (cow skin) served with plantains. Rich, savory, and deeply satisfying.",
  4: "A flavorful mix of corn, beans, and vegetables. Simple, nutritious, and budget-friendly.",
  5: "Scrambled egg sauce served with boiled yam. Simple, delicious, and ready in minutes.",
  6: "Melon seed soup with assorted meat and vegetables, served with yam. A festive classic.",
  7: "Grated cocoyam wrapped in leaves, steamed to perfection. A unique texture and earthy flavor.",
  8: "Finely shredded eru leaves with waterleaf and cow skin, served with garri. A beloved classic.",
  9: "Cameroonian-style fried rice with vegetables and meat. Colorful, flavorful, and satisfying.",
  10: "Corn fufu served with njama njama (huckleberry leaves). A traditional pairing full of flavor.",
  11: "Garri (cassava flakes) served with okra soup. Light, refreshing, and easy to digest.",
  12: "A spicy one-pot meal with meat, vegetables, and plantains. Perfect for those who love heat.",
  13: "West African-style jollof rice with tomatoes, onions, and spices. A party favorite.",
  14: "Grilled chicken or fish with pepper sauce. Smoky, spicy, and absolutely delicious.",
  15: "A very spicy dish made with cocoyam and assorted meat. Not for the faint-hearted!",
  16: "Steamed bean pudding (koki) served with fried plantains. A protein-rich vegetarian option.",
  17: "Kwacoco (fermented cocoyam) served with canda sauce. A traditional delicacy.",
  18: "Palm nut soup with meat and fish, served with plantains or rice. Rich, creamy, and indulgent.",
  19: "Tender meat stew served with fried plantains. Comfort food at its best.",
  20: "Rich meat stew served over steamed rice. A complete and satisfying meal.",
  21: "Bitter leaf stew with groundnuts and meat, served with corn fufu. Complex and deeply flavorful.",
  22: "Bitter leaf stew with groundnuts and meat, served with yam. A classic combination.",
  23: "Onion-based sauce with meat, served with plantains. Sweet, savory, and simple.",
  24: "Spicy pepper soup with meat and plantains. Warming and aromatic, perfect for cold days.",
  25: "Creamy cocoyam porridge with vegetables and meat. Smooth, comforting, and nutritious.",
  26: "Director's chicken — grilled chicken with plantains and vegetables. A special occasion dish.",
  27: "Rice cooked with beans, onions, and spices. A staple that never disappoints.",
  28: "Steamed rice served with rich tomato stew and meat. Simple, satisfying, and delicious.",
  29: "Spaghetti in tomato sauce with meat and vegetables. A fusion favorite.",
  30: "Ripe plantains turned in oil with spices and meat. Sweet, savory, and caramelized.",
  31: "Yams turned in oil with spices and meat. Crispy outside, soft inside.",
  32: "Smooth water fufu served with eru and cow skin. A classic Cameroonian experience.",
};

/**
 * Gets the description for a meal by ID.
 * @param {number} mealId - The meal ID (1-32)
 * @returns {string} Description or fallback message
 */
export function getMealDescription(mealId) {
  return MEAL_DESCRIPTIONS[mealId] || "A delicious Cameroonian dish prepared with care.";
}