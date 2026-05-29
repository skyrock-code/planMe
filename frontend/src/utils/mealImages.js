/**
 * @file mealImages.js
 * @description Maps meal IDs and meal names to their local image files.
 *              Uses Vite's import.meta.glob to dynamically load all images
 *              from src/assets/images/ at build time.
 * @module utils
 */

// ─── DYNAMIC IMAGE LOADER ─────────────────────────────────────────────────────

const mealImages = {};

try {
  // Load all images from the images folder (not meals subfolder)
  const images = import.meta.glob(
    "../assets/images/*.{jpg,jpeg,png,webp,jfif,gif}",
    { eager: true }
  );

  Object.entries(images).forEach(([path, image]) => {
    // Extract filename without extension, lowercase
    const fileName = path.split("/").pop().split(".").shift().toLowerCase();
    mealImages[fileName] = image.default || image;
  });
  
  console.log(` Loaded ${Object.keys(mealImages).length} meal images`);

} catch (e) {
  console.warn("PlanMe: Could not load meal images from assets folder.", e);
}

// ─── MEAL ID → IMAGE FILENAME MAPPING ────────────────────────────────────────

const IMAGE_MAPPING_BY_ID = {
  1:  ["achu"],
  2:  ["acrabeans", "beans-and-plantain", "beans-plantain", "beans and plantain"],
  3:  ["canda-sauce", "canda sauce"],
  4:  ["cornchaff", "corn-chaff", "corn chaff"],
  5:  ["egg-sauce-and-plantain", "egg-sauce", "egg sauce", "egg sauce and yam"],
  6:  ["efo-egusi-1-scaled", "recipe-for-egusi-soup", "egusi-pudding", "egusi pudding", "egusi soup"],
  7:  ["ekwang"],
  8:  ["garri-and-eru", "garri and eru", "water-fufu-and-eru", "eru and garri"],
  9:  ["fried-rice", "fried rice"],
  10: ["fufu-and-njama-mjama", "fufu and njama njama", "njama-mjama"],
  11: ["okra", "garri-and-okra-soup", "garri and okra soup", "okra-soup-and-garry"],
  12: ["hotpot", "hot-pot-irish", "hot pot irish"],
  13: ["jollof-rice", "jollof rice"],
  14: ["african-grilled-chicken", "katikati", "grilled chicken"],
  15: ["kondre"],
  16: ["koki_beans", "koki-beans", "coki", "koki and plantain"],
  17: ["kwakoko-bible-and-canda-sauce", "kwacoco bible", "kwakoko bible"],
  18: ["mbanga-sauce", "mbanga sauce", "mbongo tchobi"],
  19: ["stew-plantain", "nyama", "meat-stew-and-plantain", "meat stew and plantain"],
  20: ["rice-and-stew", "rice and stew", "meat stew and rice"],
  21: ["ndole", "cameroon-ndole-dish", "ndole-with-shrimps", "ndole and fufu corn"],
  22: ["ndole", "cameroon-ndole-dish", "ndole-with-shrimps", "ndole and yam"],
  23: ["onion-sauce", "onion sauce"],
  24: ["pepper-soup-post-thumbnail-360x360", "pepper-soup", "pepper soup and plantain"],
  25: ["coc-yams-porridge", "coc-yams", "porridge cocoyam"],
  26: ["pouletdg", "poulet-dg-recipe", "poulet-dg-top-shot", "poulet dg"],
  27: ["rice-and-beans", "rice and beans"],
  28: ["rice-and-stew", "rice and stew"],
  29: ["spagetti", "spaghetti"],
  30: ["turning-plantain", "turning-planty", "turning plantain"],
  31: ["turning-yam", "turning yams"],
  32: ["water-fufu-and-eru", "water fufu and eru", "garri and eru"],
};

const MEAL_NAME_TO_ID = {
  "achu soup":                      1,
  "beans and plantain":             2,
  "canda sauce and plantain":       3,
  "corn chaff":                     4,
  "egg sauce and yam":              5,
  "egusi soup and yam":             6,
  "ekwang":                         7,
  "eru and garri":                  8,
  "fried rice":                     9,
  "fufu corn and njama njama":      10,
  "garri and okra soup":            11,
  "hotpot":                         12,
  "jollof rice":                    13,
  "katikati":                       14,
  "kondre":                         15,
  "koki and plantain":              16,
  "kwacoco bible and canda sauce":  17,
  "mbanga soup":                    18,
  "meat stew and plantain":         19,
  "meat stew and rice":             20,
  "ndole and fufu corn":            21,
  "ndole and yam":                  22,
  "onion sauce and plantain":       23,
  "pepper soup and plantain":       24,
  "porridge cocoyam":               25,
  "poulet dg":                      26,
  "rice and beans":                 27,
  "rice and stew":                  28,
  "spaghetti":                      29,
  "turning plantain":               30,
  "turning yams":                   31,
  "water fufu and eru":             32,
};

export function getMealImage(mealIdOrName) {
  if (!mealIdOrName) return getFallbackImage();

  let mealId;

  if (typeof mealIdOrName === "number") {
    mealId = mealIdOrName;
  } else {
    const nameKey = String(mealIdOrName).toLowerCase().trim();
    mealId = MEAL_NAME_TO_ID[nameKey];
    if (!mealId) return getFallbackImage();
  }

  const candidates = IMAGE_MAPPING_BY_ID[mealId] || [];
  for (const candidate of candidates) {
    const img = mealImages[candidate.toLowerCase()];
    if (img) return img;
  }

  return getFallbackImage();
}

export function getFallbackImage() {
  return mealImages["placeholder"] ||
         mealImages["fallback"] ||
         "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";
}

export default { getMealImage, getFallbackImage };