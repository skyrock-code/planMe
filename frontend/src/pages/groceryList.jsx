/**
 * @file GroceryList.jsx
 * @description Grocery List screen for the PlanMe app.
 *              Displays all ingredients needed for the current meal plan,
 *              grouped by category, with quantities, units, and estimated
 *              prices in FCFA. Users can check off items as they shop.
 *              Matches the list.html design and PlanMe design system.
 * @module pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopAppBar from "../components/layout/TopAppBar";
import Button from "../components/ui/Button";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Hardcoded grocery data for UI — will come from Flask API in Phase 4.
// Prices reflect real Cameroonian market values from the meal database.

/**
 * Grocery list items grouped by category.
 * Each item has a unique id, name, quantity, unit, and estimated price in FCFA.
 */
const GROCERY_GROUPS = [
  {
    category: "Proteins",
    icon: "egg",
    items: [
      { id: 1,  name: "Chicken",        quantity: 1,   unit: "piece",  price: 3500 },
      { id: 2,  name: "Smoked Fish",    quantity: 2,   unit: "piece",  price: 1000 },
      { id: 3,  name: "Beef",           quantity: 500, unit: "g",      price: 2500 },
    ],
  },
  {
    category: "Vegetables",
    icon: "nutrition",
    items: [
      { id: 4,  name: "Bitter Leaf",    quantity: 1,   unit: "bunch",  price: 300  },
      { id: 5,  name: "Tomato",         quantity: 6,   unit: "piece",  price: 300  },
      { id: 6,  name: "Onion",          quantity: 3,   unit: "piece",  price: 150  },
      { id: 7,  name: "Leek",           quantity: 1,   unit: "bunch",  price: 200  },
    ],
  },
  {
    category: "Staples",
    icon: "grass",
    items: [
      { id: 8,  name: "Plantain",       quantity: 1,   unit: "hand",   price: 500  },
      { id: 9,  name: "Cocoyam",        quantity: 1,   unit: "kg",     price: 600  },
      { id: 10, name: "Rice",           quantity: 2,   unit: "cup",    price: 400  },
    ],
  },
  {
    category: "Pantry",
    icon: "kitchen",
    items: [
      { id: 11, name: "Palm Oil",       quantity: 0.5, unit: "L",      price: 500  },
      { id: 12, name: "Crayfish",       quantity: 1,   unit: "pack",   price: 300  },
      { id: 13, name: "Maggi Cubes",    quantity: 1,   unit: "pack",   price: 100  },
      { id: 14, name: "Pepper",         quantity: 4,   unit: "piece",  price: 100  },
    ],
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Formats a number as a locale-friendly FCFA string.
 * @param {number} amount
 * @returns {string}
 */
function formatFCFA(amount) {
  return `${amount.toLocaleString("fr-CM")} FCFA`;
}

/**
 * Calculates the total price of all items in the grocery list.
 * @param {Array} groups - Array of category groups with items
 * @returns {number} Total price in FCFA
 */
function calculateTotal(groups) {
  return groups.reduce(
    (total, group) =>
      total + group.items.reduce((sum, item) => sum + item.price, 0),
    0
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * GroceryList page component.
 *
 * Shows all ingredients needed for the current meal plan grouped by category.
 * Users can check off items as they shop at the market.
 * Displays a running total at the bottom.
 *
 * In Phase 4, this list will be generated from the active MealPlan
 * by the Flask backend, pulling from the Meal_Ingredients database.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function GroceryList() {
  const navigate = useNavigate();

  // Track which items have been checked off (by item id)
  const [checkedItems, setCheckedItems] = useState(new Set());

  /**
   * Toggles the checked state of a grocery item.
   * @param {number} itemId - The item's unique id
   */
  function handleToggleItem(itemId) {
    setCheckedItems((prev) => {
      const updated = new Set(prev);
      if (updated.has(itemId)) {
        updated.delete(itemId);
      } else {
        updated.add(itemId);
      }
      return updated;
    });
  }

  // Calculate totals
  const totalPrice     = calculateTotal(GROCERY_GROUPS);
  const totalItems     = GROCERY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
  const checkedCount   = checkedItems.size;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">

      {/* ── Sticky top bar ── */}
      <TopAppBar
        title="Grocery List"
        onBack={() => navigate(-1)}
        rightIcon="share"
        onRightAction={() => {}}
      />

      {/* ── Summary banner ── */}
      <div className="px-4 pt-4">
        <div className="bg-white dark:bg-[#1a2e1d] rounded-xl p-4 shadow-sm border border-gray-50 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-1">
                Total Estimated Cost
              </p>
              <p className="text-2xl font-bold text-[#111812] dark:text-white">
                {formatFCFA(totalPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-1">
                Progress
              </p>
              <p className="text-lg font-bold text-primary">
                {checkedCount}/{totalItems}
              </p>
            </div>
          </div>

          {/* Shopping progress bar */}
          <div className="mt-3 w-full bg-gray-100 dark:bg-[#253d28] h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{
                width: totalItems > 0
                  ? `${Math.round((checkedCount / totalItems) * 100)}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Grocery groups ── */}
      <main className="px-4 pt-4 flex flex-col gap-4">
        {GROCERY_GROUPS.map((group) => (
          <div key={group.category}>

            {/* Category header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="material-symbols-outlined text-primary text-base">
                {group.icon}
              </span>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#618968]">
                {group.category}
              </h3>
            </div>

            {/* Items list */}
            <div className="bg-white dark:bg-[#1a2e1d] rounded-xl overflow-hidden shadow-sm border border-gray-50 dark:border-gray-800">
              {group.items.map((item, index) => {
                const isChecked = checkedItems.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleItem(item.id)}
                    aria-label={`${isChecked ? "Uncheck" : "Check"} ${item.name}`}
                    className={[
                      "w-full flex items-center justify-between p-4 text-left transition-colors",
                      index < group.items.length - 1
                        ? "border-b border-gray-50 dark:border-gray-800"
                        : "",
                      isChecked ? "bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-white/5",
                    ].join(" ")}
                  >
                    {/* Checkbox + item name */}
                    <div className="flex items-center gap-3">
                      {/* Custom checkbox */}
                      <div
                        className={[
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-gray-300 dark:border-gray-600",
                        ].join(" ")}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-white text-sm">
                            check
                          </span>
                        )}
                      </div>

                      {/* Item name + quantity */}
                      <div>
                        <p
                          className={[
                            "font-semibold text-sm",
                            isChecked
                              ? "line-through text-gray-400"
                              : "text-[#111812] dark:text-white",
                          ].join(" ")}
                        >
                          {item.name}
                        </p>
                        <p className="text-xs text-[#618968]">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <p
                      className={[
                        "text-sm font-bold",
                        isChecked ? "text-gray-400" : "text-[#111812] dark:text-white",
                      ].join(" ")}
                    >
                      {formatFCFA(item.price)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* ── Fixed bottom action bar ── */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-3 bg-white/95 dark:bg-background-dark/95 border-t border-[#618968]/10">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon="check_circle"
          onClick={() => navigate("/week-plan")}
        >
          Done Shopping
        </Button>
      </div>

      {/* ── Fixed bottom navigation ── */}
      <BottomNavBar />
    </div>
  );
}