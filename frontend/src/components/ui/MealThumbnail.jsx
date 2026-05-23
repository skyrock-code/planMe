/**
 * @file MealThumbnail.jsx
 * @description Reusable MealThumbnail component for the PlanMe app.
 *              A compact square card showing a meal image and name.
 *              Used in the Dashboard "Tomorrow's Menu" horizontal scroll section.
 *              Optionally tappable to navigate to meal details.
 * @module components/ui
 */

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * PlanMe MealThumbnail component.
 *
 * Used on:
 * - Dashboard screen : "Tomorrow's Menu" horizontal scroll row
 *
 * Renders a fixed-width card with a square meal image on top
 * and a truncated meal name below. Tappable if onPress is provided.
 *
 * @component
 * @param {Object}    props
 * @param {string}    props.mealName  - Name of the meal (truncated if long)
 * @param {string}    props.imageUrl  - URL for the meal image
 * @param {string}    props.imageAlt  - Accessible alt text for the image
 * @param {function}  props.onPress   - Called when the thumbnail is tapped (optional)
 * @param {string}    props.className - Extra Tailwind classes for overrides
 * @returns {JSX.Element}
 */
export default function MealThumbnail({
  mealName,
  imageUrl,
  imageAlt,
  onPress,
  className = "",
}) {
  // Use a button when tappable, a div when purely decorative
  const Wrapper = onPress ? "button" : "div";

  return (
    <Wrapper
      type={onPress ? "button" : undefined}
      onClick={onPress}
      aria-label={onPress ? `View ${mealName}` : undefined}
      className={[
        // Fixed width to enable horizontal scrolling in the parent container
        "min-w-[140px] flex flex-col gap-2",
        onPress ? "active:scale-95 transition-transform cursor-pointer" : "",
        className,
      ].join(" ")}
    >
      {/* Square meal image */}
      <div
        className="w-full aspect-square rounded-xl bg-cover bg-center bg-gray-100 dark:bg-white/10"
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={imageAlt ?? mealName}
      />

      {/* Meal name — truncated to one line */}
      <p className="text-sm font-bold text-[#111812] dark:text-white truncate px-0.5">
        {mealName}
      </p>
    </Wrapper>
  );
}

// ─── PREVIEW ──────────────────────────────────────────────────────────────────
// Temporary preview — import into App.jsx to test.
// DELETE before production.

/**
 * MealThumbnailPreview — shows MealThumbnail in a horizontal scroll row,
 * exactly as it appears in the Dashboard "Tomorrow's Menu" section.
 * Usage in App.jsx:
 *   import { MealThumbnailPreview } from './components/ui/MealThumbnail'
 *   export default function App() { return <MealThumbnailPreview /> }
 *
 * @returns {JSX.Element}
 */
export function MealThumbnailPreview() {
  /** Sample meals matching the Dashboard design */
  const tomorrowMeals = [
    {
      id: 1,
      mealName: "Ndolé with Miondo",
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200",
      imageAlt: "A serving of Cameroonian Ndolé",
    },
    {
      id: 2,
      mealName: "Achu & Yellow Soup",
      imageUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?w=200",
      imageAlt: "Achu soup bowl",
    },
    {
      id: 3,
      mealName: "Grilled Tilapia",
      imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200",
      imageAlt: "Grilled fish with pepper sauce",
    },
  ];

  return (
    <div className="min-h-screen bg-background-light p-6 flex flex-col gap-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-[#111812]">
        PlanMe — MealThumbnail Component
      </h1>

      {/* Horizontal scroll row — mirrors Dashboard layout */}
      <section className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#111812]">Tomorrow's Menu</h2>
          <button className="text-sm font-bold text-[#618968]">See All</button>
        </div>

        {/* Horizontal scrollable row — no scrollbar shown */}
        <div
          className="flex gap-4 overflow-x-auto pb-2"
          style={{ scrollbarWidth: "none" }}
        >
          {tomorrowMeals.map((meal) => (
            <MealThumbnail
              key={meal.id}
              mealName={meal.mealName}
              imageUrl={meal.imageUrl}
              imageAlt={meal.imageAlt}
              onPress={() => alert(`Tapped: ${meal.mealName}`)}
            />
          ))}
        </div>
      </section>

      {/* Static (non-tappable) version */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
          Static (no onPress)
        </h2>
        <div className="flex gap-4">
          {tomorrowMeals.slice(0, 2).map((meal) => (
            <MealThumbnail
              key={meal.id}
              mealName={meal.mealName}
              imageUrl={meal.imageUrl}
              imageAlt={meal.imageAlt}
            />
          ))}
        </div>
      </section>
    </div>
  );
}