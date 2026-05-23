/**
 * @file MealCard.jsx
 * @description Reusable MealCard component for the PlanMe app.
 *              Displays a meal with its image, name, meal type (lunch/dinner),
 *              estimated cost in FCFA, and a "View Recipe" button.
 *              Used on the WeekPlan screen as the main meal entry per day,
 *              and on the Dashboard as the "Today's Meal" featured card.
 *
 *              Two layout modes:
 *              - 'row'      : horizontal layout (image right, content left) — WeekPlan
 *              - 'featured' : vertical layout (image top, content below) — Dashboard
 * @module components/ui
 */

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Formats a number as a locale-friendly FCFA string.
 * Example: 3500 → "Est. 3,500 FCFA"
 *
 * @param {number} amount
 * @returns {string}
 */
function formatCost(amount) {
  return `Est. ${amount.toLocaleString("fr-CM")} FCFA`;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe MealCard component.
 *
 * Used on:
 * - WeekPlan screen : one card per planned meal day (row layout)
 * - Dashboard       : "Today's Meal" featured card (featured layout)
 *
 * @component
 * @param {Object}    props
 * @param {string}    props.mealName      - Name of the meal (e.g. "Ndolé with Miondo")
 * @param {string}    props.mealType      - Meal slot label (e.g. "Lunch", "Dinner")
 * @param {number}    props.estimatedCost - Cost in FCFA
 * @param {string}    props.imageUrl      - URL for the meal image
 * @param {string}    props.imageAlt      - Accessible alt text for the image
 * @param {string}    props.description   - Short description (featured mode only)
 * @param {number}    props.prepTime      - Prep time in minutes (featured mode only)
 * @param {number}    props.servings      - Number of servings (featured mode only)
 * @param {boolean}   props.isToday       - Adds a "Today" badge to the card
 * @param {'row'|'featured'} props.layout - Card layout mode (default: 'row')
 * @param {function}  props.onViewRecipe  - Called when "View Recipe" is pressed
 * @param {string}    props.className     - Extra Tailwind classes
 * @returns {JSX.Element}
 */
export default function MealCard({
  mealName,
  mealType,
  estimatedCost,
  imageUrl,
  imageAlt,
  description,
  prepTime,
  servings,
  isToday = false,
  layout = "row",
  onViewRecipe,
  className = "",
}) {

  // ─── Featured layout (Dashboard "Today's Meal") ───────────────────────────
  if (layout === "featured") {
    return (
      <div
        className={[
          "rounded-xl overflow-hidden shadow-sm",
          "bg-white dark:bg-[#1a2e1d]",
          className,
        ].join(" ")}
      >
        {/* Full-width meal image */}
        <div
          className="w-full h-48 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
          role="img"
          aria-label={imageAlt ?? mealName}
        />

        {/* Card body */}
        <div className="flex flex-col gap-2 p-4">

          {/* Name + meal type badge */}
          <div className="flex justify-between items-start">
            <p className="text-[#111812] dark:text-white text-xl font-bold">
              {mealName}
            </p>
            <span className="px-2 py-1 bg-primary/10 text-[#618968] dark:text-primary text-xs font-bold rounded-full">
              {mealType}
            </span>
          </div>

          {/* Prep time + servings metadata */}
          {(prepTime || servings) && (
            <div className="flex items-center gap-4">
              {prepTime && (
                <div className="flex items-center gap-1 text-[#618968] dark:text-primary/80">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    schedule
                  </span>
                  <p className="text-sm">{prepTime} mins</p>
                </div>
              )}
              {servings && (
                <div className="flex items-center gap-1 text-[#618968] dark:text-primary/80">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    restaurant
                  </span>
                  <p className="text-sm">{servings} servings</p>
                </div>
              )}
            </div>
          )}

          {/* Short description */}
          {description && (
            <p className="text-[#618968] dark:text-white/70 text-sm leading-relaxed mt-1">
              {description}
            </p>
          )}

          {/* View recipe CTA */}
          <button
            type="button"
            onClick={onViewRecipe}
            className="mt-2 w-full flex items-center justify-center rounded-full h-11 bg-primary text-[#111812] text-sm font-bold shadow-sm active:scale-95 transition-transform"
          >
            View Full Recipe
          </button>
        </div>
      </div>
    );
  }

  // ─── Row layout (WeekPlan screen) ─────────────────────────────────────────
  return (
    <div
      className={[
        "flex items-stretch justify-between gap-4 rounded-xl p-4 shadow-sm",
        "bg-white dark:bg-white/5",
        // Highlight today's card with a green left border
        isToday ? "border-l-4 border-primary" : "",
        className,
      ].join(" ")}
    >
      {/* Left content — meal info + button */}
      <div className="flex flex-[2] flex-col justify-between">
        <div className="flex flex-col gap-1">

          {/* Meal type label (e.g. LUNCH, DINNER) */}
          <p className="text-[#618968] dark:text-primary/70 text-[10px] font-bold uppercase tracking-widest">
            {mealType}
          </p>

          {/* Meal name */}
          <p className="text-[#111812] dark:text-white text-lg font-bold leading-tight">
            {mealName}
          </p>

          {/* Estimated cost */}
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

        {/* View Recipe button */}
        <button
          type="button"
          onClick={onViewRecipe}
          className="mt-4 flex items-center justify-center gap-1 rounded-full h-9 px-4 bg-[#f0f4f1] dark:bg-white/10 text-[#111812] dark:text-white text-sm font-bold w-fit active:scale-95 transition-transform"
        >
          <span>View Recipe</span>
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            chevron_right
          </span>
        </button>
      </div>

      {/* Right content — square meal image */}
      <div
        className="w-28 aspect-square rounded-xl bg-cover bg-center shrink-0"
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={imageAlt ?? mealName}
      />
    </div>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * MealCardPreview — shows both layout modes with realistic Cameroonian meal data.
 * Usage in App.jsx:
 *   import { MealCardPreview } from './components/ui/MealCard'
 *   export default function App() { return <MealCardPreview /> }
 *
 * @returns {JSX.Element}
 */
export function MealCardPreview() {
  return (
    <div className="min-h-screen bg-background-light p-6 flex flex-col gap-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — MealCard Component
      </h1>

      {/* Featured layout — Dashboard */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Featured (Dashboard)
        </h2>
        <MealCard
          layout="featured"
          mealName="Poulet DG"
          mealType="Dinner"
          estimatedCost={6000}
          prepTime={45}
          servings={4}
          description="A celebrated Cameroonian dish of sautéed chicken and fried plantains in a savory tomato sauce."
          imageUrl="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400"
          imageAlt="Poulet DG with fried plantains"
          onViewRecipe={() => alert("View recipe!")}
        />
      </section>

      {/* Row layout — WeekPlan (today) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Row Layout (WeekPlan)
        </h2>

        <MealCard
          layout="row"
          mealName="Ndolé with Miondo"
          mealType="Dinner"
          estimatedCost={3500}
          imageUrl="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200"
          imageAlt="Ndolé with Miondo"
          isToday={true}
          onViewRecipe={() => alert("View Ndolé recipe!")}
        />

        <MealCard
          layout="row"
          mealName="Achu with Yellow Soup"
          mealType="Lunch"
          estimatedCost={4500}
          imageUrl="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=200"
          imageAlt="Achu with Yellow Soup"
          isToday={false}
          onViewRecipe={() => alert("View Achu recipe!")}
        />
      </section>
    </div>
  );
}