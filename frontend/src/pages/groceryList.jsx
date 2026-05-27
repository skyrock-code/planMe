/**
 * @file GroceryList.jsx
 * @description Grocery List screen for the PlanMe app.
 *              Displays all ingredients needed for the meal plan.
 *              Users can check items, edit quantities, delete items,
 *              add custom ingredients, and export as plain text.
 *              Connected to real Flask backend for all data.
 * @module pages
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import groceryService from "../services/groceryService";
import planService from "../services/planService";
import { PageWrapper } from "../components/common";
import TopAppBar from "../components/layout/TopAppBar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import BottomNavBar from "../components/layout/BottomNavBar";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * GroceryList page component.
 *
 * Displays all ingredients needed for the selected meal plan.
 * Users can:
 * - Check/uncheck items as they shop (local state)
 * - Edit quantities (calls PATCH endpoint)
 * - Delete items (calls DELETE endpoint)
 * - Add custom ingredients (calls POST endpoint)
 * - Export list as plain text file
 *
 * @component
 * @returns {JSX.Element}
 */
export default function GroceryList() {
  const navigate = useNavigate();
  const { planId: urlPlanId } = useParams();
  const { user } = useAuth();

  // ── State ──
  const [groceryData, setGroceryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkedItems, setCheckedItems] = useState(new Set());

  // Edit quantity state
  const [editingId, setEditingId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [savingQty, setSavingQty] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  // Add custom item state
  const [showAddForm, setShowAddForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("");
  const [customUnit, setCustomUnit] = useState("piece");
  const [customPrice, setCustomPrice] = useState("");
  const [saveToPro, setSaveToPro] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  // Save feedback toast
  const [saveToast, setSaveToast] = useState("");
  // Empty string = hidden, any string = shown as toast

  // ── Data Fetching ──
  /**
   * Shows a brief success toast message then auto-hides it.
   * @param {string} message - Short message to display
   */
  function showToast(message) {
    setSaveToast(message);
    setTimeout(() => setSaveToast(""), 2000);
  }

  const fetchGroceryList = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      setLoading(true);
      setError("");

      let targetPlanId = urlPlanId;

      // No planId in URL — get most recent plan
      if (!targetPlanId) {
        const plans = await planService.getUserPlans(user.user_id);
        if (plans.length === 0) {
          setError("no_plans");
          return;
        }
        const recent = plans.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )[0];
        targetPlanId = recent.plan_id;
      }

      // Generate/fetch grocery list for this plan
      const data = await groceryService.generateGroceryList(targetPlanId);
      setGroceryData(data);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load grocery list. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [urlPlanId, user?.user_id]);

  useEffect(() => {
    fetchGroceryList();
  }, [fetchGroceryList]);

  // ── Handlers ──
  function handleToggleCheck(itemId) {
    setCheckedItems((prev) => {
      const updated = new Set(prev);
      updated.has(itemId) ? updated.delete(itemId) : updated.add(itemId);
      return updated;
    });
  }

  function startEditQty(item) {
    setEditingId(item.item_id);
    setEditQty(String(item.quantity));
  }

  async function saveEditQty(itemId) {
    const qty = parseFloat(editQty);
    if (isNaN(qty) || qty <= 0) return;
    try {
      setSavingQty(true);
      await groceryService.updateItemQuantity(itemId, qty);
      await fetchGroceryList();
      setEditingId(null);
      showToast("✓ Quantity updated");
    } catch (err) {
      setError("Failed to update quantity.");
    } finally {
      setSavingQty(false);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditQty("");
  }

  async function handleDeleteItem(itemId) {
    try {
      setDeletingId(itemId);
      await groceryService.removeItem(itemId);
      await fetchGroceryList();
      showToast("✓ Item removed");
    } catch (err) {
      setError("Failed to remove item.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAddCustom() {
    if (!customName || !customQty || !customPrice) return;
    if (!groceryData?.list_id) return;
    try {
      setAddingItem(true);
      await groceryService.addCustomIngredient(groceryData.list_id, {
        name: customName,
        quantity: parseFloat(customQty),
        unit_price: parseFloat(customPrice),
        unit: customUnit,
        save_to_profile: saveToPro,
        user_id: user.user_id,
      });
      setCustomName("");
      setCustomQty("");
      setCustomPrice("");
      setCustomUnit("piece");
      setSaveToPro(false);
      setShowAddForm(false);
      await fetchGroceryList();
      showToast("✓ Item added");
    } catch (err) {
      setError("Failed to add ingredient.");
    } finally {
      setAddingItem(false);
    }
  }

  function handleExport() {
    if (!groceryData) return;

    const lines = [
      "PLANME GROCERY LIST",
      "===================",
      `Budget: ${groceryData.budget?.toLocaleString("fr-CM")} FCFA`,
      `Total:  ${groceryData.total_price?.toLocaleString("fr-CM")} FCFA`,
      `Status: ${groceryData.within_budget ? "Within budget" : "Over budget"}`,
      "",
      "ITEMS:",
      "------",
      ...(groceryData.items || []).map(
        (item) =>
          `${item.name.padEnd(25)} ${item.quantity} ${item.unit.padEnd(8)} ${item.total_price?.toLocaleString("fr-CM")} FCFA`
      ),
      "",
      `Generated by PlanMe — ${new Date().toLocaleDateString()}`,
    ];

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planme-grocery-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Render ──
  if (error === "no_plans") {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex flex-col items-center justify-center gap-4 p-8 mt-12">
          <span className="material-symbols-outlined text-6xl text-[#618968]">
            shopping_cart
          </span>
          <h2 className="text-xl font-bold text-[#111812] dark:text-white">
            No Active Plan
          </h2>
          <p className="text-center text-[#618968] text-sm">
            Create a meal plan first to generate a grocery list.
          </p>
          <Button
            variant="primary"
            size="lg"
            icon="add_circle"
            onClick={() => navigate("/new-plan")}
          >
            Create Plan
          </Button>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  return (
    <PageWrapper
      loading={loading}
      error={error}
      onRetry={fetchGroceryList}
      loadingMsg="Loading grocery list..."
    >
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">

        {/* ── Top bar ── */}
        <TopAppBar
          title="Grocery List"
          subtitle={
            groceryData
              ? `${groceryData.items?.length || 0} items • ${groceryData.total_price?.toLocaleString("fr-CM") || "0"} FCFA`
              : ""
          }
          onBack={() => navigate(-1)}
        />

        {/* ── Budget status card ── */}
        {groceryData && (
          <div className="px-4 py-3">
            <div className={[
              "rounded-xl p-4 border",
              groceryData.within_budget
                ? "bg-primary/10 border-primary/20"
                : "bg-red-50/10 border-red-100/20"
            ].join(" ")}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-[#618968] mb-1">
                    Budget Status
                  </p>
                  <p className={[
                    "font-bold text-lg",
                    groceryData.within_budget
                      ? "text-primary"
                      : "text-red-500"
                  ].join(" ")}>
                    {groceryData.within_budget ? "Within Budget" : "Over Budget"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#618968] mb-1">Total / Budget</p>
                  <p className="text-lg font-bold text-[#111812] dark:text-white">
                    {groceryData.total_price?.toLocaleString("fr-CM")} / {groceryData.budget?.toLocaleString("fr-CM")} FCFA
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (groceryData.total_price / groceryData.budget) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Add custom item form ── */}
        {showAddForm && (
          <div className="mx-4 mt-4 mb-4 bg-white dark:bg-[#1a2e1d] rounded-xl p-4 border border-primary/20 shadow-sm">
            <h4 className="font-bold text-[#111812] dark:text-white mb-3">
              Add Custom Ingredient
            </h4>

            <div className="flex flex-col gap-3">
              <Input
                placeholder="Ingredient name"
                type="text"
                shape="box"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />

              <div className="flex gap-2">
                <Input
                  placeholder="Qty"
                  type="number"
                  shape="box"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  min="0"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="flex-1 h-14 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {["piece", "bunch", "pack", "cup", "tbsp", "tsp", "kg", "g", "L", "ml", "hand", "root", "clove", "bulb", "stalk", "tin"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <Input
                placeholder="Price per unit (FCFA)"
                type="number"
                shape="box"
                suffix="FCFA"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                min="0"
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setSaveToPro((prev) => !prev)}
                  className={[
                    "w-12 h-6 rounded-full relative transition-colors cursor-pointer",
                    saveToPro ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                  ].join(" ")}
                >
                  <div
                    className={[
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      saveToPro ? "right-1" : "left-1"
                    ].join(" ")}
                  />
                </div>
                <span className="text-sm text-[#618968]">
                  Save for future use
                </span>
              </label>

              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={addingItem}
                  onClick={handleAddCustom}
                >
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Save feedback toast ── */}
        {saveToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                          bg-primary text-[#111812] font-bold text-sm
                          px-4 py-2 rounded-full shadow-lg
                          animate-bounce">
            {saveToast}
          </div>
        )}

        {/* ── Grocery items list ── */}
        <div className="px-4 py-2">
          {(groceryData?.items || []).length > 0 ? (
            (groceryData.items || []).map((item) => {
              const isChecked = checkedItems.has(item.item_id);
              const isEditing = editingId === item.item_id;
              const isDeleting = deletingId === item.item_id;

              return (
                <div
                  key={item.item_id}
                  className={[
                    "flex items-center justify-between p-4 border-b",
                    "border-gray-50 dark:border-gray-800 last:border-0",
                    isChecked ? "bg-primary/5 opacity-60" : "bg-white dark:bg-[#1a2e1d]",
                  ].join(" ")}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleCheck(item.item_id)}
                    className={[
                      "w-6 h-6 rounded-full border-2 flex items-center",
                      "justify-center shrink-0 transition-colors mr-3",
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
                  </button>

                  {/* Item name + quantity editor */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={[
                        "font-semibold text-sm truncate",
                        isChecked
                          ? "line-through text-gray-400"
                          : "text-[#111812] dark:text-white",
                      ].join(" ")}
                    >
                      {item.name}
                      {item.is_custom && (
                        <span className="ml-2 text-xs text-primary font-normal">
                          (custom)
                        </span>
                      )}
                    </p>

                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          min="0"
                          className="w-20 h-8 rounded-lg border border-primary px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          autoFocus
                        />
                        <span className="text-xs text-[#618968]">{item.unit}</span>
                        <button
                          type="button"
                          onClick={() => saveEditQty(item.item_id)}
                          disabled={savingQty}
                          className="text-primary text-xs font-bold hover:underline disabled:opacity-50"
                        >
                          {savingQty ? "..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-gray-400 text-xs hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-[#618968] mt-0.5">
                        {item.quantity} {item.unit}
                        {" · "}
                        <button
                          type="button"
                          onClick={() => startEditQty(item)}
                          className="text-primary hover:underline"
                        >
                          Edit
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Price + delete */}
                  <div className="flex items-center gap-2 ml-2">
                    <p
                      className={[
                        "text-sm font-bold whitespace-nowrap",
                        isChecked ? "text-gray-400" : "text-[#111812] dark:text-white",
                      ].join(" ")}
                    >
                      {item.total_price?.toLocaleString("fr-CM")} F
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.item_id)}
                      disabled={isDeleting}
                      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-base">
                        {isDeleting ? "hourglass_empty" : "delete_outline"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <span className="material-symbols-outlined text-5xl text-[#618968]">
                checklist
              </span>
              <p className="text-[#618968] text-sm">No items in list</p>
            </div>
          )}
        </div>

        {/* ── Fixed bottom action bar ── */}
        <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-3 bg-white/95 dark:bg-background-dark/95 border-t border-[#618968]/10">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="md"
              icon="add"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              Add Item
            </Button>
            <Button
              variant="outline"
              size="md"
              icon="download"
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="primary"
              size="md"
              icon="check_circle"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Done
            </Button>
          </div>
        </div>

        {/* ── Bottom navigation ── */}
        <BottomNavBar />
      </div>
    </PageWrapper>
  );
}
