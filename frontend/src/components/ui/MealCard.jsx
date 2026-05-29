/**
 * @file MealCard.jsx
 * @description Reusable MealCard component for the PlanMe app.
 *              Displays a meal with its image, name, meal type,
 *              optional description, and swap button (handled by parent).
 *
 *              Two layout modes:
 *              - 'row'      : horizontal layout (WeekPlan)
 *              - 'featured' : vertical layout (Dashboard)
 * @module components/ui
 */

import { getMealImage } from "../../utils/mealImages";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatCost(amount) {
  return `Est. ${amount.toLocaleString("fr-CM")} FCFA`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe MealCard component.
 *
 * @param {Object}    props
 * @param {string}    props.mealName      - Name of the meal
 * @param {string}    props.mealType      - Meal slot label (e.g. "Cooking Session")
 * @param {number}    props.estimatedCost - Cost in FCFA (optional)
 * @param {string}    props.imageUrl      - URL for the meal image (optional)
 * @param {number}    props.mealId        - Meal ID for image lookup (preferred)
 * @param {string}    props.description   - Short description of the meal
 * @param {string}    props.imageAlt      - Accessible alt text for the image
 * @param {boolean}   props.isToday       - Adds a "Today" badge
 * @param {'row'|'featured'} props.layout - Card layout mode (default: 'row')
 * @param {string}    props.className     - Extra Tailwind classes
 * @returns {JSX.Element}
 */
export default function MealCard({
  mealName,
  mealType,
  estimatedCost,
  imageUrl,
  mealId,
  description,
  imageAlt,
  isToday = false,
  layout = "row",
  className = "",
}) {
  // Use getMealImage if mealId is provided, otherwise fallback to imageUrl or mealName
  const imgSrc = mealId 
    ? getMealImage(mealId) 
    : (imageUrl || getMealImage(mealName));

  // ─── Featured layout (Dashboard) ─────────────────────────────────────────
  if (layout === "featured") {
    return (
      <div className={["rounded-xl overflow-hidden shadow-sm bg-white dark:bg-[#1a2e1d]", className].join(" ")}>
        <div
          className="w-full h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${imgSrc})` }}
          role="img"
          aria-label={imageAlt ?? mealName}
        />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex justify-between items-start">
            <p className="text-[#111812] dark:text-white text-xl font-bold">{mealName}</p>
            <span className="px-2 py-1 bg-primary/10 text-[#618968] dark:text-primary text-xs font-bold rounded-full">
              {mealType}
            </span>
          </div>
          {description && (
            <p className="text-[#618968] dark:text-white/70 text-sm leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Row layout (WeekPlan) ────────────────────────────────────────────────
  return (
    <div
      className={[
        "flex items-stretch justify-between gap-4 rounded-xl p-4 shadow-sm",
        "bg-white dark:bg-white/5",
        isToday ? "border-l-4 border-primary" : "",
        className,
      ].join(" ")}
    >
      {/* Left content — meal info */}
      <div className="flex flex-[2] flex-col justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[#618968] dark:text-primary/70 text-[10px] font-bold uppercase tracking-widest">
            {mealType}
          </p>
          <p className="text-[#111812] dark:text-white text-lg font-bold leading-tight">
            {mealName}
          </p>
          {/* DESCRIPTION - inside the card, below meal name */}
          {description && (
            <p className="text-xs text-[#618968] mt-1 line-clamp-2">
              {description}
            </p>
          )}
          {estimatedCost != null && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="material-symbols-outlined text-sm text-[#618968]" aria-hidden="true">
                payments
              </span>
              <p className="text-[#618968] dark:text-primary/80 text-xs font-semibold">
                {formatCost(estimatedCost)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right content — square meal image */}
      <div
        className="w-28 aspect-square rounded-xl bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(${imgSrc})` }}
        role="img"
        aria-label={imageAlt ?? mealName}
      />
    </div>
  );
}