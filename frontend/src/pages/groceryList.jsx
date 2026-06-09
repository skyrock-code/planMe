import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["Proteins", "Starches", "Vegetables", "Spices", "Oils", "Other"];

const CATEGORY_STYLES = {
  Proteins:   { border: "border-red-400",    text: "text-red-600 dark:text-red-400"       },
  Starches:   { border: "border-yellow-400", text: "text-yellow-700 dark:text-yellow-400" },
  Vegetables: { border: "border-green-500",  text: "text-green-700 dark:text-green-400"   },
  Spices:     { border: "border-orange-400", text: "text-orange-600 dark:text-orange-400" },
  Oils:       { border: "border-amber-400",  text: "text-amber-700 dark:text-amber-400"   },
  Other:      { border: "border-gray-400",   text: "text-gray-500 dark:text-gray-400"     },
};

function normalizeCategory(raw) {
  const found = CATEGORY_ORDER.find(
    (c) => c.toLowerCase() === (raw ?? "").toLowerCase()
  );
  return found ?? "Other";
}

// ─── ADD INGREDIENT MODAL ─────────────────────────────────────────────────────

function AddIngredientModal({ listId, onClose, onAdded }) {
  const [query, setQuery]                           = useState("");
  const [results, setResults]                       = useState([]);
  const [searching, setSearching]                   = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [quantity, setQuantity]                     = useState("1");
  const [showCustomForm, setShowCustomForm]         = useState(false);
  const [customForm, setCustomForm]                 = useState({
    name: "", unit: "", price: "", quantity: "1",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const debounceRef                 = useRef(null);
  const searchInputRef              = useRef(null);

  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setSelectedIngredient(null);
    setShowCustomForm(false);
    setError("");
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) { setResults([]); return; }
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

  function handleSelectIngredient(ing) {
    setSelectedIngredient(ing);
    setShowCustomForm(false);
    setResults([]);
    setError("");
  }

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
        const qty = parseFloat(quantity);
        if (!qty || qty <= 0) { setError("Please enter a valid quantity."); return; }
        await groceryService.addIngredient(listId, {
          ingredient_id: selectedIngredient.id,
          quantity: qty,
        });
      } else if (showCustomForm) {
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
      onAdded();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to add ingredient.");
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = selectedIngredient || showCustomForm;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[430px] bg-white dark:bg-[#1a2e1d] rounded-2xl max-h-[85vh] overflow-y-auto mx-4">

        <div className="flex flex-col items-center pt-3 pb-2 sticky top-0 bg-white dark:bg-[#1a2e1d] z-10 rounded-t-2xl">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/20 mb-4" />
          <div className="flex w-full items-center justify-between px-5">
            <h2 className="text-lg font-bold text-[#111812] dark:text-white">Add Ingredient</h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-sm text-[#111812] dark:text-white">close</span>
            </button>
          </div>
        </div>

        <div className="px-5 pb-8 flex flex-col gap-4">

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
                    i < results.length - 1 ? "border-b border-[#dbe6dd]/50 dark:border-white/5" : "",
                  ].join(" ")}
                >
                  <div>
                    <p className="font-semibold text-sm text-[#111812] dark:text-white">{ing.name}</p>
                    <p className="text-xs text-[#618968] mt-0.5">
                      {ing.market_unit} · {formatFCFA(ing.unit_price_xaf)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-xl shrink-0">add_circle</span>
                </button>
              ))}
            </div>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && !selectedIngredient && !showCustomForm && (
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

          {selectedIngredient && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-[#111812] dark:text-white">{selectedIngredient.name}</p>
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
              {quantity && parseFloat(quantity) > 0 && (
                <p className="text-xs text-[#618968] text-right">
                  Total: {formatFCFA(round2(parseFloat(quantity) * selectedIngredient.unit_price_xaf))}
                </p>
              )}
            </div>
          )}

          {showCustomForm && (
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 p-4 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968]">
                Custom Ingredient
              </p>
              {[
                { label: "Name",        key: "name",     type: "text",   placeholder: "e.g. Fresh ginger" },
                { label: "Unit",        key: "unit",     type: "text",   placeholder: "e.g. piece, kg, bunch" },
                { label: "Price (XAF)", key: "price",    type: "number", placeholder: "e.g. 300" },
                { label: "Quantity",    key: "quantity", type: "number", placeholder: "e.g. 2" },
              ].map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <label className="text-sm font-semibold text-[#111812] dark:text-white w-24 shrink-0">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={customForm[field.key]}
                    onChange={(e) => setCustomForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="flex-1 h-10 px-3 rounded-xl border border-[#dbe6dd] dark:border-white/10 bg-white dark:bg-white/5 text-[#111812] dark:text-white placeholder:text-[#618968]/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500 dark:text-red-400 px-1">{error}</p>}

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

export default function GroceryList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // ── Plan ID ──
  const [planId, setPlanId]           = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // ── Server data ──
  const [items, setItems]               = useState([]);
  const [listId, setListId]             = useState(null);
  const [totalPrice, setTotalPrice]     = useState(0);
  const [budget, setBudget]             = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  // ── Editing: { id, field: 'quantity'|'total_price', value: string } ──
  const [editingItem, setEditingItem]   = useState(null);

  // ── Item actions ──
  const [deletingItemId, setDeletingItemId] = useState(null);
  const [showModal, setShowModal]           = useState(false);

  // ── Bulk hide (view-only, no DB changes) ──
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems]     = useState(new Set());
  const [hiddenItems, setHiddenItems]         = useState(new Set());

  // ── Export ──
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copySuccess, setCopySuccess]       = useState(false);
  const exportMenuRef                       = useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function onOutsideClick(e) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("touchstart", onOutsideClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("touchstart", onOutsideClick);
    };
  }, [showExportMenu]);

  // ── Fetch most recent plan ──
  useEffect(() => {
    async function getMostRecentPlan() {
      if (!user?.user_id) return;
      try {
        const plans = await planService.getUserPlans(user.user_id);
        if (plans.length > 0) {
          const mostRecent = plans.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
          )[0];
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

  function applyListData(data) {
    setItems(data.items ?? []);
    setListId(data.list_id);
    setTotalPrice(data.total_price ?? 0);
    setBudget(data.budget ?? 0);
  }

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
    if (planId) loadList();
  }, [loadList, planId]);

  // Silent refresh — updates items + total without showing the loading spinner
  async function silentRefresh() {
    if (!planId) return;
    try {
      const data = await groceryService.fetchList(planId);
      applyListData(data);
    } catch {}
  }

  async function handleRegenerate() {
    if (!planId) return;
    setLoading(true);
    setError("");
    try {
      const data = await groceryService.generateList(planId);
      applyListData(data);
      // Regenerating restores all items — clear all view-only state
      setHiddenItems(new Set());
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      setEditingItem(null);
    } catch (err) {
      setError(err.response?.data?.error ?? "Regeneration failed.");
    } finally {
      setLoading(false);
    }
  }

  // ── Bidirectional editing ──

  function startEditing(itemId, field, currentValue) {
    setEditingItem({ id: itemId, field, value: String(currentValue) });
  }

  async function saveEdit(itemId, field) {
    const value = parseFloat(editingItem?.value);
    setEditingItem(null);
    if (isNaN(value) || value <= 0) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((it) => {
        if (it.item_id !== itemId) return it;
        if (field === "quantity") {
          return { ...it, quantity: value, total_price: round2(value * it.unit_price) };
        } else {
          const newQty = it.unit_price > 0 ? round2(value / it.unit_price) : it.quantity;
          return { ...it, total_price: value, quantity: newQty };
        }
      })
    );

    try {
      const result = await groceryService.updateItem(itemId, { [field]: value });
      setItems((prev) =>
        prev.map((it) =>
          it.item_id === itemId
            ? { ...it, quantity: result.quantity, total_price: result.total_price }
            : it
        )
      );
      setTotalPrice(result.list_total);
    } catch {
      await loadList();
    }
  }

  // ── Item actions ──

  async function handleDelete(itemId) {
    setDeletingItemId(itemId);
    setItems((prev) => prev.filter((it) => it.item_id !== itemId));
    try {
      await groceryService.removeItem(itemId);
      await silentRefresh();
    } catch {
      await loadList();
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleToggleHome(itemId) {
    setItems((prev) =>
      prev.map((it) =>
        it.item_id === itemId ? { ...it, always_at_home: !it.always_at_home } : it
      )
    );
    try {
      const result = await groceryService.toggleAlwaysAtHome(itemId);
      setTotalPrice(result.new_total);
    } catch {
      await loadList();
    }
  }

  async function handleBulkCategoryToggle(category, categoryItems) {
    setEditingItem(null);
    const allAtHome  = categoryItems.every((i) => i.always_at_home);
    const shouldBeAt = !allAtHome;
    const toToggle   = categoryItems.filter((i) => i.always_at_home !== shouldBeAt);
    if (toToggle.length === 0) return;

    setItems((prev) =>
      prev.map((it) =>
        toToggle.some((t) => t.item_id === it.item_id)
          ? { ...it, always_at_home: shouldBeAt }
          : it
      )
    );

    try {
      await Promise.all(toToggle.map((item) => groceryService.toggleAlwaysAtHome(item.item_id)));
      await silentRefresh();
    } catch {
      await loadList();
    }
  }

  // ── Bulk hide (view-only — no DB calls) ──

  function toggleSelectItem(itemId) {
    const updated = new Set(selectedItems);
    updated.has(itemId) ? updated.delete(itemId) : updated.add(itemId);
    setSelectedItems(updated);
  }

  function toggleSelectCategory(categoryItems) {
    const updated   = new Set(selectedItems);
    const allPicked = categoryItems.every((item) => updated.has(item.item_id));
    categoryItems.forEach((item) =>
      allPicked ? updated.delete(item.item_id) : updated.add(item.item_id)
    );
    setSelectedItems(updated);
  }

  function selectAll() {
    setSelectedItems(new Set(visibleItems.map((i) => i.item_id)));
  }

  function hideSelected() {
    setHiddenItems((prev) => new Set([...prev, ...selectedItems]));
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  }

  function cancelSelection() {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  }

  // ── Derived values ──

  const visibleItems = useMemo(
    () => items.filter((i) => !hiddenItems.has(i.item_id)),
    [items, hiddenItems]
  );

  const groupedItems = useMemo(() => {
    const groups = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]));
    for (const item of visibleItems) {
      const cat = item.is_custom ? "Other" : normalizeCategory(item.category);
      groups[cat].push(item);
    }
    return groups;
  }, [visibleItems]);

  // Total excluding hidden items AND always_at_home items (frontend only)
  const visibleTotal = useMemo(
    () =>
      Math.round(
        visibleItems.reduce(
          (sum, item) => sum + (item.always_at_home ? 0 : item.total_price),
          0
        ) * 100
      ) / 100,
    [visibleItems]
  );

  const withinBudget = budget > 0 ? visibleTotal <= budget : true;

  // ── Export ──

  function generateTextContent() {
    const date = new Date().toLocaleDateString();
    const lines = [
      "PlanMe - Grocery List",
      `Date: ${date}`,
      `Budget: ${formatFCFA(budget)}`,
      `Total:  ${formatFCFA(visibleTotal)}${
        withinBudget
          ? " (within budget)"
          : ` (${formatFCFA(visibleTotal - budget)} over budget)`
      }`,
      "",
    ];
    for (const category of CATEGORY_ORDER) {
      const catItems = groupedItems[category] ?? [];
      if (catItems.length === 0) continue;
      lines.push(`--- ${category} ---`);
      for (const item of catItems) {
        const atHome = item.always_at_home ? " [at home]" : "";
        const unit   = item.unit ? ` ${item.unit}` : "";
        lines.push(
          `  ${item.name} ${item.quantity}${unit} = ${item.total_price} XAF${atHome}`
        );
      }
      lines.push("");
    }
    return lines.join("\n").trim();
  }

  function handleDownload() {
    const text = generateTextContent();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "grocery-list.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(generateTextContent());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {}
  }

  async function handleShare() {
    setShowExportMenu(false);
    if (navigator.share) {
      try {
        await navigator.share({ title: "My Grocery List - PlanMe", text: generateTextContent() });
      } catch {}
    } else {
      await copyToClipboard();
    }
  }

  async function handleCopy() {
    setShowExportMenu(false);
    await copyToClipboard();
  }

  // ── Loading / error states ──

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

  if (!planId && !loadingPlan) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="material-symbols-outlined text-5xl text-[#618968]">restaurant_plan</span>
          <p className="font-semibold text-[#111812] dark:text-white">No meal plan found</p>
          <p className="text-sm text-[#618968]">Create a meal plan first to generate a grocery list.</p>
          <Button variant="primary" onClick={() => navigate("/new-plan")}>Create Plan</Button>
        </div>
        <BottomNavBar />
      </div>
    );
  }

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

  if (error && items.length === 0) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
        <TopAppBar title="Grocery List" onBack={() => navigate(-1)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="material-symbols-outlined text-5xl text-red-400">error_outline</span>
          <p className="font-semibold text-[#111812] dark:text-white">{error}</p>
          <Button variant="outline" onClick={loadList}>Try Again</Button>
          <Button variant="ghost" onClick={() => navigate("/new-plan")}>Create New Plan</Button>
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

      {/* ── Budget card ── */}
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
                {formatFCFA(visibleTotal)}
              </p>
              {budget > 0 && (
                <p className="text-xs text-[#618968] mt-0.5">
                  Budget: {formatFCFA(budget)}{" "}
                  {withinBudget ? (
                    <span className="text-primary font-semibold">✓ within budget</span>
                  ) : (
                    <span className="text-red-500 font-semibold">
                      — {formatFCFA(visibleTotal - budget)} over
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-[#618968] mb-1">
                Items
              </p>
              <p className="text-xl font-bold text-primary">
                {visibleItems.length}
              </p>
              {hiddenItems.size > 0 && (
                <p className="text-xs text-[#618968]">{hiddenItems.size} hidden</p>
              )}
            </div>
          </div>

          {/* Budget utilisation bar */}
          <div className="mt-3 w-full bg-gray-100 dark:bg-[#253d28] h-2 rounded-full overflow-hidden">
            <div
              className={[
                "h-full rounded-full transition-all duration-300",
                withinBudget ? "bg-primary" : "bg-red-500",
              ].join(" ")}
              style={{
                width: `${Math.min(100, budget > 0 ? (visibleTotal / budget) * 100 : 0)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Selection / bulk action bar ── */}
      <div className="flex items-center justify-between px-4 py-2 mt-1">
        {!isSelectionMode ? (
          <button
            type="button"
            onClick={() => setIsSelectionMode(true)}
            className="text-sm text-[#618968] font-semibold"
          >
            Select items
          </button>
        ) : (
          <div className="flex gap-4 items-center">
            <button
              type="button"
              onClick={selectAll}
              className="text-sm font-semibold text-primary"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={hideSelected}
              disabled={selectedItems.size === 0}
              className="text-sm font-semibold text-red-500 disabled:opacity-40"
            >
              Remove ({selectedItems.size})
            </button>
            <button
              type="button"
              onClick={cancelSelection}
              className="text-sm text-[#618968]"
            >
              Cancel
            </button>
          </div>
        )}

        {hiddenItems.size > 0 && !isSelectionMode && (
          <button
            type="button"
            onClick={() => setHiddenItems(new Set())}
            className="text-xs text-[#618968]/70 underline"
          >
            Show {hiddenItems.size} hidden
          </button>
        )}
      </div>

      {/* ── Items list (grouped by category) ── */}
      <main className="px-4 pt-1 flex flex-col gap-2">

        {visibleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <span className="material-symbols-outlined text-5xl text-[#618968]/30">shopping_cart</span>
            <p className="text-[#618968] text-sm text-center">
              {hiddenItems.size > 0
                ? 'All items are hidden. Tap “Show hidden” to restore them.'
                : "Your grocery list is empty."}
            </p>
            {hiddenItems.size === 0 && (
              <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                Add First Ingredient
              </Button>
            )}
          </div>
        ) : (
          <>
            {CATEGORY_ORDER.map((category) => {
              const catItems   = groupedItems[category] ?? [];
              if (catItems.length === 0) return null;
              const style      = CATEGORY_STYLES[category];
              const allAtHome  = catItems.every((i) => i.always_at_home);
              const someAtHome = catItems.some((i) => i.always_at_home);
              const allSelected = catItems.every((i) => selectedItems.has(i.item_id));

              return (
                <div key={category}>
                  {/* ── Category header ── */}
                  <div
                    className={[
                      "flex items-center gap-2 px-3 py-1.5 mb-1",
                      "border-l-4 rounded-r-lg",
                      "bg-gray-50 dark:bg-white/5",
                      style.border,
                    ].join(" ")}
                  >
                    {/* Selection checkbox on category */}
                    {isSelectionMode && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleSelectCategory(catItems)}
                        className="w-4 h-4 accent-primary shrink-0"
                        aria-label={`Select all ${category}`}
                      />
                    )}

                    <span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>
                      {category}
                    </span>
                    <span className="ml-auto text-xs text-[#618968]/50">
                      {catItems.length} item{catItems.length !== 1 ? "s" : ""}
                    </span>

                    {/* Bulk at-home toggle (hidden while in selection mode) */}
                    {!isSelectionMode && (
                      <button
                        type="button"
                        onClick={() => handleBulkCategoryToggle(category, catItems)}
                        title={
                          allAtHome
                            ? "Mark all as needed"
                            : someAtHome
                              ? "Mark remaining at home"
                              : "Mark all at home"
                        }
                        aria-label={`Toggle all ${category} items at home`}
                        className={[
                          "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                          allAtHome
                            ? "bg-primary/10 border-primary/30 text-primary"
                            : someAtHome
                              ? "bg-primary/5 border-primary/20 text-primary/50"
                              : "border-gray-200 dark:border-white/15 text-gray-300 hover:border-gray-300 hover:text-[#618968]",
                        ].join(" ")}
                      >
                        <span className="material-symbols-outlined text-[12px]">home</span>
                      </button>
                    )}
                  </div>

                  {/* ── Items in this category ── */}
                  <div className="bg-white dark:bg-[#1a2e1d] rounded-xl overflow-hidden shadow-sm border border-gray-50 dark:border-gray-800 mb-3">
                    {catItems.map((item, index) => {
                      const isAtHome     = item.always_at_home;
                      const isDeleting   = deletingItemId === item.item_id;
                      const isSelected   = selectedItems.has(item.item_id);
                      const canEdit      = !isAtHome && !isSelectionMode;
                      const isEditingQty = editingItem?.id === item.item_id && editingItem.field === "quantity";
                      const isEditingTot = editingItem?.id === item.item_id && editingItem.field === "total_price";

                      return (
                        <div
                          key={item.item_id}
                          className={[
                            "flex items-start gap-3 px-4 py-3 transition-all",
                            index < catItems.length - 1
                              ? "border-b border-gray-50 dark:border-gray-800"
                              : "",
                            isAtHome   ? "opacity-50" : "",
                            isSelected ? "bg-primary/5" : "",
                            isDeleting ? "opacity-40 pointer-events-none" : "",
                          ].join(" ")}
                        >
                          {/* Checkbox: selection in selection mode, otherwise shopping toggle */}
                          {isSelectionMode ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.item_id)}
                              className="w-5 h-5 accent-primary mt-0.5 shrink-0"
                              aria-label={`Select ${item.name}`}
                            />
                          ) : (
                            <div className="mt-0.5 w-5 h-5 shrink-0" />
                          )}

                          {/* Content: name + formula */}
                          <div className="flex-1 min-w-0">
                            {/* Name row */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p
                                className={[
                                  "font-semibold text-sm",
                                  isAtHome
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
                              {isAtHome && (
                                <span className="shrink-0 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold">
                                  At home
                                </span>
                              )}
                            </div>

                            {/* Bidirectional formula: [qty unit] = [total XAF] */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">

                              {/* Quantity (click to edit) */}
                              {isEditingQty ? (
                                <input
                                  type="number"
                                  value={editingItem.value}
                                  min="0.01"
                                  step="0.1"
                                  inputMode="decimal"
                                  autoFocus
                                  onChange={(e) =>
                                    setEditingItem((prev) => ({ ...prev, value: e.target.value }))
                                  }
                                  onBlur={() => saveEdit(item.item_id, "quantity")}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && saveEdit(item.item_id, "quantity")
                                  }
                                  className="w-20 px-2 py-1 text-xs font-bold border-2 border-primary rounded-lg bg-white dark:bg-white/10 text-[#111812] dark:text-white focus:outline-none"
                                  aria-label="Edit quantity"
                                />
                              ) : (
                                <span
                                  onClick={() =>
                                    canEdit &&
                                    startEditing(item.item_id, "quantity", item.quantity)
                                  }
                                  className={[
                                    "text-xs font-semibold px-1.5 py-0.5 rounded transition-colors",
                                    canEdit
                                      ? "text-[#111812] dark:text-white cursor-pointer hover:text-primary hover:bg-primary/5"
                                      : "text-gray-400 cursor-default",
                                  ].join(" ")}
                                  title={canEdit ? "Tap to edit quantity" : undefined}
                                >
                                  {item.quantity} {item.unit}
                                </span>
                              )}

                              <span className="text-xs text-[#618968]">=</span>

                              {/* Total price (click to edit) */}
                              {isEditingTot ? (
                                <input
                                  type="number"
                                  value={editingItem.value}
                                  min="1"
                                  step="100"
                                  inputMode="numeric"
                                  autoFocus
                                  onChange={(e) =>
                                    setEditingItem((prev) => ({ ...prev, value: e.target.value }))
                                  }
                                  onBlur={() => saveEdit(item.item_id, "total_price")}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && saveEdit(item.item_id, "total_price")
                                  }
                                  className="w-28 px-2 py-1 text-xs font-bold border-2 border-primary rounded-lg bg-white dark:bg-white/10 text-[#111812] dark:text-white focus:outline-none"
                                  aria-label="Edit total price"
                                />
                              ) : (
                                <span
                                  onClick={() =>
                                    canEdit &&
                                    startEditing(item.item_id, "total_price", item.total_price)
                                  }
                                  className={[
                                    "text-xs font-bold px-1.5 py-0.5 rounded transition-colors",
                                    isAtHome
                                      ? "line-through text-gray-400 cursor-default"
                                      : canEdit
                                        ? "text-[#111812] dark:text-white cursor-pointer hover:text-primary hover:bg-primary/5"
                                        : "text-[#111812] dark:text-white cursor-default",
                                  ].join(" ")}
                                  title={canEdit ? "Tap to edit total price" : undefined}
                                >
                                  {item.total_price.toLocaleString("fr-CM")} XAF
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions (hidden in selection mode) */}
                          {!isSelectionMode && (
                            <div className="flex items-center gap-1 mt-0.5 shrink-0">
                              {/* Always-at-home toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleHome(item.item_id)}
                                aria-label={isAtHome ? "Mark as needed" : "Mark as always at home"}
                                title={isAtHome ? "I need to buy this" : "I always have this at home"}
                                className={[
                                  "w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                                  isAtHome
                                    ? "text-primary bg-primary/10"
                                    : "text-gray-300 hover:text-[#618968] hover:bg-gray-100 dark:hover:bg-white/10",
                                ].join(" ")}
                              >
                                <span className="material-symbols-outlined text-sm">home</span>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(item.item_id)}
                                aria-label={`Remove ${item.name}`}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm text-gray-300 hover:text-red-500 transition-colors">
                                  delete
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Hint */}
        {visibleItems.length > 0 && !isSelectionMode && (
          <p className="text-xs text-[#618968]/60 text-center pt-1 pb-2">
            Tap qty or total to edit · tap{" "}
            <span className="material-symbols-outlined text-[11px] align-middle">home</span>{" "}
            to mark as always at home
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

          {/* Export dropdown */}
          <div className="relative flex-1" ref={exportMenuRef}>
            <Button
              variant="outline"
              size="md"
              icon={copySuccess ? "check_circle" : "share"}
              className="w-full"
              onClick={() => setShowExportMenu((v) => !v)}
            >
              {copySuccess ? "Copied!" : "Export"}
            </Button>

            {showExportMenu && (
              <div className="absolute bottom-full mb-2 left-0 w-44 bg-white dark:bg-[#1a2e1d] rounded-xl border border-gray-100 dark:border-white/10 shadow-lg overflow-hidden z-50">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-primary/5 transition-colors text-[#111812] dark:text-white"
                >
                  <span className="material-symbols-outlined text-base text-[#618968]">download</span>
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-primary/5 transition-colors text-[#111812] dark:text-white border-t border-gray-50 dark:border-white/5"
                >
                  <span className="material-symbols-outlined text-base text-[#618968]">share</span>
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left hover:bg-primary/5 transition-colors text-[#111812] dark:text-white border-t border-gray-50 dark:border-white/5"
                >
                  <span className="material-symbols-outlined text-base text-[#618968]">
                    {copySuccess ? "check_circle" : "content_copy"}
                  </span>
                  {copySuccess ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            )}
          </div>

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
