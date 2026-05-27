/**
 * @file mealImages.js
 * @description Meal image URL mapping for PlanMe.
 *              Maps meal names to relevant Unsplash photos.
 *              Used by MealCard, MealThumbnail, and Dashboard
 *              to display visually appealing meal representations.
 *
 *              Fallback image shown when no match found.
 *
 * @module utils
 */

/**
 * Map of meal names (lowercase) to Unsplash image URLs.
 * Images selected to visually represent Cameroonian cuisine.
 */
const MEAL_IMAGES = {
  // Soups and stews
  "ndole and fufu corn":         "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  "ndole and yam":               "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  "egusi soup and yam":          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
  "mbanga soup":                 "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "achu soup":                   "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80",
  "eru and garri":               "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "water fufu and eru":          "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "garri and okra soup":         "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80",
  "pepper soup and plantain":    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",

  // Rice dishes
  "jollof rice":                 "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&q=80",
  "fried rice":                  "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80",
  "rice and beans":              "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80",
  "rice and stew":               "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80",

  // Plantain dishes
  "poulet dg":                   "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
  "meat stew and plantain":      "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80",
  "beans and plantain":          "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80",
  "canda sauce and plantain":    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "onion sauce and plantain":    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "turning plantain":            "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80",
  "koki and plantain":           "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",

  // Yam and cocoyam dishes
  "egg sauce and yam":           "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80",
  "turning yams":                "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400&q=80",
  "porridge cocoyam":            "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "ekwang":                      "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",
  "kondre":                      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "kwacoco bible and canda sauce":"https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",

  // Corn and grain dishes
  "corn chaff":                  "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&q=80",
  "fufu corn and njama njama":   "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&q=80",

  // Grilled dishes
  "katikati":                    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",

  // Pasta
  "spaghetti":                   "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80",

  // Other
  "hotpot":                      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80",
  "meat stew and rice":          "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80",
}

/**
 * Fallback image shown when no meal-specific image found.
 * Generic food/cooking image.
 */
const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80"

/**
 * Returns the image URL for a given meal name.
 * Performs case-insensitive lookup.
 * Returns fallback image if no match found.
 *
 * @param {string} mealName - The meal name to look up
 * @returns {string} Unsplash image URL
 *
 * @example
 * getMealImage("Poulet DG")     // returns poulet dg URL
 * getMealImage("Unknown Meal")  // returns fallback URL
 */
export function getMealImage(mealName) {
  if (!mealName) return FALLBACK_IMAGE
  const key = mealName.toLowerCase().trim()
  return MEAL_IMAGES[key] ?? FALLBACK_IMAGE
}

export default MEAL_IMAGES
