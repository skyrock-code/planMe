/**
 * @file GroceryList.jsx
 * @description Grocery List screen for the PlanMe app.
 *
 *              Features:
 *              - Loads from /saved endpoint (no regeneration on every visit)
 *              - If no list exists yet, generates it once automatically
 *              - Automatically fetches the user's most recent plan
 *              - Inline quantity editing — saved immediately to backend
 *              - Per-item delete with optimistic UI update
 *              - Add Ingredient modal:
 *                  1. Searches the ingredients database first
 *                  2. User selects a DB ingredient → correct unit/price auto-filled
 *                  3. If nothing found → user can add a custom ingredient manually
 *              - Refresh icon in top bar forces regeneration from meals
 *
 * @module pages
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopAppBar from "../components/layout/TopAppBar";
import Button from "../components/ui/Button";
import BottomNavBar from "../components/layout/BottomNavBar";
import groceryService from "../services/groceryService";
import planService from "../services/planService";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatFCFA(amount) {
  return `${(amount ?? 0).toLocaleString("fr-CM")} FCFA`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ─── ADD INGREDIENT MODAL ─────────────────────────────────────────────────────

/**
 * Centered modal for adding an ingredient to the grocery list.
 *
 * Flow:
 * 1. User types a search query (≥2 chars triggers live search)
 * 2. If DB matches found → user picks one → enters quantity → confirms
 * 3. If no matches found → "Add as custom" prompt appears
 *    → user fills name / unit / price / quantity → confirms
 *
 * @param {number}   listId   - The grocery list's database ID
 * @param {function} onClose  - Called when modal is dismissed
 * @param {function} onAdded  - Called after successful add (triggers list reload)
 */
function AddIngredientModal({ listId, onClose, onAdded }) {
  const [query, setQuery]                     = useState("");
  const [results, setResults]                 = useState([]);
  const [searching, setSearching]             = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [quantity, setQuantity]               = useState("1");
  const [showCustomForm, setShowCustomForm]   = useState(false);
  const [customForm, setCustomForm]           = useState({
    name: "", unit: "", price: "", quantity: "1",
  });
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState("");
  const debounceRef                           = useRef(null);
  const searchInputRef                        = useRef(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  // Live search with 350 ms debounce
  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setSelectedIngredient(null);
    setShowCustomForm(false);
    setError("");

    clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await groceryService.searchIngredients(val.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  // User picked a DB ingredient from the results list
  function handleSelectIngredient(ing) {
    setSelectedIngredient(ing);
    setShowCustomForm(false);
    setResults([]);
    setError("");
  }

  // User chose to add a custom ingredient instead
  function handleAddCustom() {
    setShowCustomForm(true);
    setSelectedIngredient(null);
    setCustomForm((f) => ({ ...f, name: query }));
    setError("");
  }

  async function handleConfirm() {
    setError("");
    setSubmitting(true);

    try {
      if (selectedIngredient) {
        // ── DB ingredient ──
        const qty = parseFloat(quantity);
        if (!qty || qty <= 0) {
          setError("Please enter a valid quantity.");
          return;
        }
        await groceryService.addIngredient(listId, {
          ingredient_id: selectedIngredient.id,
          quantity: qty,
        });

      } else if (showCustomForm) {
        // ── Custom ingredient ──
        const { name, unit, price, quantity: customQty } = customForm;
        if (!name.trim()) { setError("Name is required."); return; }
        if (!price || parseFloat(price) <= 0) { setError("Enter a valid price."); return; }
        if (!customQty || parseFloat(customQty) <= 0) { setError("Enter a valid quantity."); return; }

        await groceryService.addIngredient(listId, {
          name:       name.trim(),
          unit:       unit.trim(),
          unit_price: parseFloat(price),
          quantity:   parseFloat(customQty),
        });

      } else {
        setError("Search for an ingredient or add a custom one.");
        return;
      }

      onAdded();   // trigger reload in parent
      onClose();

    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to add ingredient.");
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = selectedIngredient || showCustomForm;

  return (
    // Backdrop - centered modal
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal container - centered with margin */}
      <div className="w-full max-w-[430px] bg-white dark:bg-[#1a2e1d] rounded-2xl max-h-[85vh] overflow-y-auto mx-4">
        
        {/* Header */}
        <div className="flex flex-col items-center pt-3 pb-2 sticky top-0 bg-white dark:bg-[#1a2e1d] z-10 rounded-t-2xl">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20 mb-4" />
          <div className="flex w-full items-center justify-between px-5">
            <h2 className="text-lg font-bold text-[#111812] dark:text-white">
              Add Ingredient
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-sm text-[#111812] dark:text-white">
                close
              </span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 flex flex-col gap-4">

          {/* ── Search input ── */}
          <div className="relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#618968] pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search ingredients (e.g. onion, palm oil…)"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white placeholder:text-[#618968]/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {/* ── Search results ── */}
          {!searching && results.length > 0 && !selectedIngredient && (
            <div className="rounded-xl border border-[#dbe6dd] dark:border-white/10 overflow-hidden">
              {results.map((ing, i) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => handleSelectIngredient(ing)}
                  className={[
                    "w-full flex items-center justify-between p-3 text-left",
                    "hover:bg-primary/5 active:bg-primary/10 transition-colors",
                    i < results.length - 1
                      ? "border-b border-[#dbe6dd]/50 dark:border-white/5"
                      : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-semibold text-sm text-[#111812] dark:text-white">
                      {ing.name}
                    </p>
                    <p className="text-xs text-[#618968] mt-0.5">
                      {ing.market_unit} · {formatFCFA(ing.unit_price_xaf)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-xl shrink-0">
                    add_circle
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── No results → offer custom add ── */}
          {!searching &&
            query.trim().length >= 2 &&
            results.length === 0 &&
            !selectedIngredient &&
            !showCustomForm && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                "{query}" not found in the database
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 mb-3">
                You can still add it manually as a custom ingredient.
              </p>
              <button
                type="button"
                onClick={handleAddCustom}
                className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Add "{query}" as custom
              </button>
            </div>
          )}

          {/* ── Selected DB ingredient — quantity input ── */}
          {selectedIngredient && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[#111812] dark:text-white">
                    {selectedIngredient.name}
                  </p>
                  <p className="text-xs text-[#618968] mt-0.5">
                    {formatFCFA(selectedIngredient.unit_price_xaf)} per {selectedIngredient.market_unit}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedIngredient(null); setResults([]); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear selection"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-[#111812] dark:text-white w-20 shrink-0">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  min="0.1"
                  step="0.1"
                  onChange={(e) => setQuantity(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <span className="text-sm text-[#618968] shrink-0">
                  {selectedIngredient.market_unit}
                </span>
              </div>

              {/* Live price preview */}
              {quantity && parseFloat(quantity) > 0 && (
                <p className="text-xs text-[#618968] text-right">
                  Total: {formatFCFA(round2(parseFloat(quantity) * selectedIngredient.unit_price_xaf))}
                </p>
              )}
            </div>
          )}

          {/* ── Custom ingredient form ── */}
          {showCustomForm && (
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968]">
                Custom Ingredient
              </p>

              {[
                { label: "Name",       key: "name",     type: "text",   placeholder: "e.g. Fresh ginger" },
                { label: "Unit",       key: "unit",     type: "text",   placeholder: "e.g. piece, kg, bunch" },
                { label: "Price (XAF)", key: "price",   type: "number", placeholder: "e.g. 300" },
                { label: "Quantity",   key: "quantity", type: "number", placeholder: "e.g. 2" },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-[#111812] dark:text-white w-24 shrink-0">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={customForm[field.key]}
                    onChange={(e) =>
                      setCustomForm((f) => ({ ...f, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="flex-1 h-10 px-3 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white placeholder:text-[#618968]/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Error message ── */}
          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 px-1">{error}</p>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border-2 border-gray-200 dark:border-white/10 text-sm font-bold text-[#618968] dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || !canConfirm}
              className="flex-[2] h-11 rounded-full bg-primary text-[#111812] text-sm font-bold disabled:opacity-40 active:scale-[0.97] transition-all"
            >
              {submitting ? "Adding…" : "Add to List"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

/**
 * GroceryList page component.
 *
 * Automatically fetches the user's most recent plan or uses planId from navigation state.
 * Falls back to loading state while fetching plan ID.
 */
export default function GroceryList() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  // ── Plan ID state ──
  const [planId, setPlanId] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // ── Data state ──
  const [items, setItems]               = useState([]);
  const [listId, setListId]             = useState(null);
  const [totalPrice, setTotalPrice]     = useState(0);
  const [budget, setBudget]             = useState(0);
  const [withinBudget, setWithinBudget] = useState(true);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // ── UI state ──
  const [checkedItems, setCheckedItems]     = useState(new Set());
  const [editingItemId, setEditingItemId]   = useState(null);
  const [editingQty, setEditingQty]         = useState("");
  const [savingItemId, setSavingItemId]     = useState(null);
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showModal, setShowModal]           = useState(false);

  // ── Fetch most recent plan ID ──
  useEffect(() => {
    async function getMostRecentPlan() {
      if (!user?.user_id) return;
      
      try {
        const plans = await planService.getUserPlans(user.user_id);
        if (plans.length > 0) {
          const mostRecent = plans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
          setPlanId(mostRecent.plan_id);
        }
      } catch (err) {
        console.error("Failed to get plans:", err);
        setError("Could not find any meal plans. Please create a plan first.");
      } finally {
        setLoadingPlan(false);
      }
    }
    
    if (location.state?.planId) {
      setPlanId(location.state.planId);
      setLoadingPlan(false);
    } else {
      getMostRecentPlan();
    }
  }, [location.state, user?.user_id]);

  // ── Apply API response to state ──
  function applyListData(data) {
    setItems(data.items ?? []);
    setListId(data.list_id);
    setTotalPrice(data.total_price ?? 0);
    setBudget(data.budget ?? 0);
    setWithinBudget(data.within_budget ?? true);
  }

  // ── Load grocery list (depends on planId) ──
  const loadList = useCallback(async () => {
    if (!planId) return;
    
    setError("");
    setLoading(true);
    try {
      let data;
      try {
        data = await groceryService.fetchList(planId);
      } catch (err) {
        if (err.response?.status === 404) {
          // No list yet — generate it for the first time
          data = await groceryService.generateList(planId);
        } else {
          throw err;
        }
      }
      applyListData(data);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load the grocery list.");
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    if (planId) {
      loadList();
    }
  }, [loadList, planId]);

  // ── Explicit regeneration (refresh button) ──
  async function handleRegenerate() {
    if (!planId) return;
    setLoading(true);
    setError("");
    try {
      const data = await groceryService.generateList(planId);
      applyListData(data);
      setCheckedItems(new Set());
      setEditingItemId(null);
    } catch (err) {
      setError(err.response?.data?.error ?? "Regeneration failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── Refresh totals from server after a change ──
  async function refreshTotals() {
    if (!planId) return;
    try {
      const data = await groceryService.fetchList(planId);
      setTotalPrice(data.total_price ?? 0);
      setWithinBudget(data.within_budget ?? true);
    } catch {
      // Non-critical — ignore
    }
  }

  // ── Check / uncheck item (shopping mode, local only) ──
  function toggleCheck(itemId) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  // ── Start inline quantity edit ──
  function startEdit(item) {
    setEditingItemId(item.item_id);
    setEditingQty(String(item.quantity));
  }

  // ── Save quantity edit ──
  async function saveEdit(itemId) {
    const qty = parseFloat(editingQty);
    setEditingItemId(null);

    if (!qty || qty <= 0) return;

    // Find original price per unit for optimistic total calculation
    const original = items.find((i) => i.item_id === itemId);
    if (!original) return;

    // Optimistic UI update
    setSavingItemId(itemId);
    setItems((prev) =>
      prev.map((it) =>
        it.item_id === itemId
          ? { ...it, quantity: qty, total_price: round2(qty * it.unit_price) }
          : it
      )
    );

    try {
      await groceryService.updateQuantity(itemId, qty);
      await refreshTotals();
    } catch {
      // Revert to server state on failure
      await loadList();
    } finally {
      setSavingItemId(null);
    }
  }

  // ── Delete item ──
  async function handleDelete(itemId) {
    // Optimistic remove
    setDeletingItemId(itemId);
    setItems((prev) => prev.filter((it) => it.item_id !== itemId));

    try {
      await groceryService.removeItem(itemId);
      await refreshTotals();
    } catch {
      // Restore on failure
      await loadList();
    } finally {
      setDeletingItemId(null);
    }
  }

  const totalItems   = items.length;
  const checkedCount = checkedItems.size;
  const progressPct  = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  // ── Loading plan ID state ──
  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#618968]">Loading plan...</p>
        </div>
      </div>
    );
  }

  // ── No plan found state ──
  if (!planId && !loadingPlan) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="material-symbols-outlined text-5xl text-[#618968]">restaurant_plan</span>
          <p className="font-semibold text-[#111812] dark:text-white">No meal plan found</p>
          <p className="text-sm text-[#618968]">Create a meal plan first to generate a grocery list.</p>
          <Button variant="primary" onClick={() => navigate("/new-plan")}>
            Create Plan
          </Button>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  // ── Loading list state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#618968]">Loading your list…</p>
        </div>
      </div>
    );
  }

  // ── Error state (no items) ──
  if (error && items.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400">error_outline</span>
          <p className="font-semibold text-[#111812] dark:text-white">{error}</p>
          <Button variant="outline" onClick={loadList}>Try Again</Button>
          <Button variant="ghost" onClick={() => navigate("/new-plan")}>
            Create New Plan
          </Button>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-36">

      {/* ── Top bar ── */}
      <TopAppBar
        title="Grocery List"
        onBack={() => navigate(-1)}
        rightIcon="refresh"
        onRightAction={handleRegenerate}
      />

      {/* ── Summary banner ── */}
      <div className="px-4 pt-4">
        <div
          className={[
            "rounded-xl p-4 shadow-sm border transition-colors",
            withinBudget
              ? "bg-white dark:bg-[#1a2e1d] border-gray-50 dark:border-gray-800"
              : "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30",
          ].join(" ")}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-1">
                Total Cost
              </p>
              <p
                className={`text-2xl font-bold ${
                  withinBudget ? "text-[#111812] dark:text-white" : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatFCFA(totalPrice)}
              </p>
              {budget > 0 && (
                <p className="text-xs text-[#618968] mt-0.5">
                  Budget: {formatFCFA(budget)}{" "}
                  {withinBudget ? (
                    <span className="text-primary font-semibold">✓ within budget</span>
                  ) : (
                    <span className="text-red-500 font-semibold">
                      — {formatFCFA(totalPrice - budget)} over
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-1">
                Progress
              </p>
              <p className="text-xl font-bold text-primary">
                {checkedCount}/{totalItems}
              </p>
              <p className="text-xs text-[#618968]">{progressPct}%</p>
            </div>
          </div>

          {/* Shopping progress bar */}
          <div className="mt-3 w-full bg-gray-100 dark:bg-[#253d28] h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Items list ── */}
      <main className="px-4 pt-4 flex flex-col gap-2">

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="material-symbols-outlined text-5xl text-[#618968]/30">
              shopping_cart
            </span>
            <p className="text-[#618968] text-sm text-center">
              Your grocery list is empty.
            </p>
            <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
              Add First Ingredient
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1a2e1d] rounded-xl overflow-hidden shadow-sm border border-gray-50 dark:border-gray-800">
            {items.map((item, index) => {
              const isChecked  = checkedItems.has(item.item_id);
              const isEditing  = editingItemId === item.item_id;
              const isSaving   = savingItemId === item.item_id;
              const isDeleting = deletingItemId === item.item_id;

              return (
                <div
                  key={item.item_id}
                  className={[
                    "flex items-center gap-3 px-4 py-3 transition-all",
                    index < items.length - 1
                      ? "border-b border-gray-50 dark:border-gray-800"
                      : "",
                    isChecked ? "bg-primary/5" : "",
                    isDeleting ? "opacity-40 pointer-events-none" : "",
                  ].join(" ")}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleCheck(item.item_id)}
                    aria-label={`${isChecked ? "Uncheck" : "Check"} ${item.name}`}
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
                  </button>

                  {/* Name + unit price */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p
                        className={[
                          "font-semibold text-sm truncate",
                          isChecked
                            ? "line-through text-gray-400"
                            : "text-[#111812] dark:text-white",
                        ].join(" ")}
                      >
                        {item.name}
                      </p>
                      {item.is_custom && (
                        <span className="shrink-0 text-[10px] bg-primary/10 text-[#618968] px-1.5 py-0.5 rounded-full font-bold">
                          custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#618968] mt-0.5">
                      {item.unit} · {formatFCFA(item.unit_price)} each
                    </p>
                  </div>

                  {/* Quantity — click to edit inline */}
                  <div className="shrink-0">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editingQty}
                        min="0.1"
                        step="0.1"
                        autoFocus
                        onChange={(e) => setEditingQty(e.target.value)}
                        onBlur={() => saveEdit(item.item_id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && saveEdit(item.item_id)
                        }
                        className="w-16 h-8 text-center text-sm font-bold rounded-lg border-2 border-primary bg-white dark:bg-white/10 text-[#111812] dark:text-white focus:outline-none"
                        aria-label="Edit quantity"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => !isChecked && startEdit(item)}
                        disabled={isChecked || isSaving}
                        title={isChecked ? "" : "Tap to edit quantity"}
                        className={[
                          "min-w-[3rem] h-8 px-2 rounded-lg text-sm font-bold transition-colors",
                          isChecked
                            ? "text-gray-400 cursor-default"
                            : "text-[#111812] dark:text-white hover:bg-primary/10 active:bg-primary/20",
                          isSaving ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        {isSaving ? "…" : `×${item.quantity}`}
                      </button>
                    )}
                  </div>

                  {/* Item total */}
                  <p
                    className={[
                      "text-sm font-bold shrink-0 w-[4.5rem] text-right",
                      isChecked ? "text-gray-400" : "text-[#111812] dark:text-white",
                    ].join(" ")}
                  >
                    {formatFCFA(item.total_price)}
                  </p>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.item_id)}
                    aria-label={`Remove ${item.name}`}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm text-gray-300 hover:text-red-500 transition-colors">
                      delete
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint for quantity editing */}
        {items.length > 0 && (
          <p className="text-xs text-[#618968]/60 text-center pt-1">
            Tap a quantity (×n) to edit it
          </p>
        )}
      </main>

      {/* ── Add Ingredient Modal ── */}
      {showModal && listId && (
        <AddIngredientModal
          listId={listId}
          onClose={() => setShowModal(false)}
          onAdded={loadList}
        />
      )}

      {/* ── Fixed bottom bar ── */}
      <div className="fixed bottom-16 left-0 right-0 max-w-[430px] mx-auto px-4 py-3 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm border-t border-[#618968]/10">
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="md"
            icon="add"
            className="flex-1"
            onClick={() => setShowModal(true)}
          >
            Add Item
          </Button>
          <Button
            variant="primary"
            size="md"
            icon="check_circle"
            className="flex-[2]"
            onClick={() => navigate("/week-plan")}
          >
            Done Shopping
          </Button>
        </div>
      </div>

      <BottomNavBar />
    </div>
  );
}