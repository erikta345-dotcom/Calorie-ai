"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";

type RecipeItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
};

type Recipe = {
  id: string;
  name: string;
  items: RecipeItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
};

type FoodResult = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MEALS = ["desayuno", "comida", "merienda", "cena", "snack"];

function MacroRow({ cal, prot, carbs, fat }: { cal: number; prot: number; carbs: number; fat: number }) {
  return (
    <div className="flex gap-3 text-xs mt-1">
      <span className="text-brand-400 font-semibold">{Math.round(cal)} kcal</span>
      <span className="text-orange-400">P {Math.round(prot)}g</span>
      <span className="text-blue-400">C {Math.round(carbs)}g</span>
      <span className="text-yellow-400">G {Math.round(fat)}g</span>
    </div>
  );
}

export default function RecipesPage() {
  const [view, setView] = useState<"list" | "create">("list");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Create view state
  const [recipeName, setRecipeName] = useState("");
  const [items, setItems] = useState<RecipeItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Add item state
  const [addTab, setAddTab] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodResult | null>(null);
  const [gramsStr, setGramsStr] = useState("100");
  const [searchLoading, setSearchLoading] = useState(false);
  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mProt, setMProt] = useState("");
  const [mCarbs, setMCarbs] = useState("");
  const [mFat, setMFat] = useState("");
  const [mGrams, setMGrams] = useState("100");

  // Log state
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logMeal, setLogMeal] = useState("comida");
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (view === "list") loadRecipes();
  }, [view]);

  async function loadRecipes() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/recipes");
      setRecipes(await res.json());
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearchLoading(true);
    setSearchResults([]);
    setSelectedFood(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setSearchResults(await res.json());
    } finally {
      setSearchLoading(false);
    }
  }

  function addSearchItem() {
    if (!selectedFood) return;
    const grams = Math.max(1, parseFloat(gramsStr) || 1);
    const f = grams / 100;
    setItems(prev => [...prev, {
      name: selectedFood.name,
      calories: selectedFood.calories * f,
      protein: selectedFood.protein * f,
      carbs: selectedFood.carbs * f,
      fat: selectedFood.fat * f,
      grams,
    }]);
    setSelectedFood(null);
    setSearchResults([]);
    setQuery("");
    setGramsStr("100");
  }

  function addManualItem() {
    const cal = parseFloat(mCal);
    if (!mName.trim() || isNaN(cal) || cal <= 0) return;
    const grams = Math.max(1, parseFloat(mGrams) || 100);
    setItems(prev => [...prev, {
      name: mName.trim(),
      calories: cal,
      protein: parseFloat(mProt) || 0,
      carbs: parseFloat(mCarbs) || 0,
      fat: parseFloat(mFat) || 0,
      grams,
    }]);
    setMName(""); setMCal(""); setMProt(""); setMCarbs(""); setMFat(""); setMGrams("100");
  }

  async function saveRecipe() {
    if (!recipeName.trim() || items.length === 0) {
      setCreateError("Añade un nombre y al menos un ingrediente.");
      return;
    }
    setSaving(true);
    setCreateError("");
    const totals = items.reduce((acc, item) => ({
      totalCalories: acc.totalCalories + item.calories,
      totalProtein: acc.totalProtein + item.protein,
      totalCarbs: acc.totalCarbs + item.carbs,
      totalFat: acc.totalFat + item.fat,
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: recipeName.trim(), items, ...totals }),
      });
      if (!res.ok) throw new Error();
      setView("list");
      setRecipeName("");
      setItems([]);
    } catch {
      setCreateError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecipe(id: string) {
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (loggingId === id) setLoggingId(null);
  }

  async function logRecipe(id: string) {
    setLogging(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch(`/api/recipes/${id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: logMeal, date: today }),
      });
      if (!res.ok) throw new Error();
      setLoggingId(null);
      setLogSuccess(id);
      setTimeout(() => setLogSuccess(null), 2000);
    } finally {
      setLogging(false);
    }
  }

  const totals = items.reduce((acc, i) => ({
    cal: acc.cal + i.calories,
    prot: acc.prot + i.protein,
    carbs: acc.carbs + i.carbs,
    fat: acc.fat + i.fat,
  }), { cal: 0, prot: 0, carbs: 0, fat: 0 });

  if (view === "create") {
    const adjusted = selectedFood
      ? (() => {
          const g = Math.max(1, parseFloat(gramsStr) || 1);
          const f = g / 100;
          return { calories: selectedFood.calories * f, protein: selectedFood.protein * f, carbs: selectedFood.carbs * f, fat: selectedFood.fat * f };
        })()
      : null;

    return (
      <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
        <header className="pt-14 pb-4 flex items-center gap-3">
          <button onClick={() => { setView("list"); setItems([]); setRecipeName(""); }} className="text-zinc-400 text-sm">
            ← Recetas
          </button>
          <h1 className="text-xl font-bold text-white">Nueva receta</h1>
        </header>

        {/* Recipe name */}
        <div className="mb-4">
          <label className="text-xs text-zinc-500 block mb-1.5">Nombre de la receta *</label>
          <input
            value={recipeName}
            onChange={(e) => setRecipeName(e.target.value)}
            placeholder="Ej: Paella valenciana"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Ingredientes ({items.length})</p>
              <MacroRow cal={totals.cal} prot={totals.prot} carbs={totals.carbs} fat={totals.fat} />
            </div>
            {items.map((item, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white font-medium">{item.name}</p>
                  <MacroRow cal={item.calories} prot={item.protein} carbs={item.carbs} fat={item.fat} />
                </div>
                <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 ml-3">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add item */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <p className="text-xs text-zinc-500 font-medium mb-3">Añadir ingrediente</p>
          <div className="flex gap-1 bg-zinc-800 rounded-lg p-1 mb-3">
            <button
              onClick={() => setAddTab("search")}
              className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${addTab === "search" ? "bg-brand-500 text-white" : "text-zinc-400"}`}
            >
              🔍 Buscar
            </button>
            <button
              onClick={() => setAddTab("manual")}
              className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors ${addTab === "manual" ? "bg-brand-500 text-white" : "text-zinc-400"}`}
            >
              ✏️ Manual
            </button>
          </div>

          {addTab === "search" && (
            <>
              {!selectedFood && (
                <>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Buscar alimento..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searchLoading}
                      className="px-3 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
                    >
                      {searchLoading ? "..." : "Buscar"}
                    </button>
                  </div>
                  {searchResults.map((food) => (
                    <button
                      key={food.id}
                      onClick={() => { setSelectedFood(food); setGramsStr("100"); }}
                      className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-xl p-3 mb-1 hover:border-brand-500 transition-colors"
                    >
                      <p className="text-sm font-medium text-white">{food.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {Math.round(food.calories)} kcal · P {Math.round(food.protein)}g · C {Math.round(food.carbs)}g · G {Math.round(food.fat)}g
                        <span className="text-zinc-600"> /100g</span>
                      </p>
                    </button>
                  ))}
                </>
              )}

              {selectedFood && adjusted && (
                <div className="space-y-3">
                  <button onClick={() => { setSelectedFood(null); setSearchResults([]); }} className="text-zinc-500 text-xs">← Volver</button>
                  <p className="text-sm font-medium text-white">{selectedFood.name}</p>
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1.5">Gramos</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gramsStr}
                      onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setGramsStr(e.target.value); }}
                      onBlur={() => setGramsStr(String(Math.max(1, parseFloat(gramsStr) || 1)))}
                      className="w-full bg-zinc-800 text-white text-center text-lg font-bold rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <MacroRow cal={adjusted.calories} prot={adjusted.protein} carbs={adjusted.carbs} fat={adjusted.fat} />
                  <button onClick={addSearchItem} className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold">
                    + Añadir
                  </button>
                </div>
              )}
            </>
          )}

          {addTab === "manual" && (
            <div className="space-y-3">
              <input
                value={mName}
                onChange={(e) => setMName(e.target.value)}
                placeholder="Nombre del ingrediente *"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Calorías *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={mCal}
                    placeholder="0"
                    onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setMCal(e.target.value); }}
                    className="w-full bg-zinc-800 text-white text-center rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Gramos</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={mGrams}
                    placeholder="100"
                    onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setMGrams(e.target.value); }}
                    className="w-full bg-zinc-800 text-white text-center rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Proteína", val: mProt, set: setMProt },
                  { label: "Carbos", val: mCarbs, set: setMCarbs },
                  { label: "Grasas", val: mFat, set: setMFat },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <label className="text-xs text-zinc-500 block mb-1">{label} (g)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={val}
                      placeholder="0"
                      onChange={(e) => { if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) set(e.target.value); }}
                      className="w-full bg-zinc-800 text-white text-center rounded-xl py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addManualItem}
                disabled={!mName.trim() || !mCal}
                className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                + Añadir
              </button>
            </div>
          )}
        </div>

        {createError && <p className="text-red-400 text-sm text-center mb-3">{createError}</p>}
        <button
          onClick={saveRecipe}
          disabled={saving || !recipeName.trim() || items.length === 0}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40"
        >
          {saving ? "Guardando..." : "💾 Guardar receta"}
        </button>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🍳 Recetas</h1>
        <button
          onClick={() => { setView("create"); setItems([]); setRecipeName(""); setCreateError(""); }}
          className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-semibold"
        >
          + Nueva
        </button>
      </header>

      {loadingList && (
        <div className="text-center text-zinc-600 text-sm mt-16">Cargando...</div>
      )}

      {!loadingList && recipes.length === 0 && (
        <div className="text-center mt-16 space-y-2">
          <p className="text-zinc-500 text-sm">Aún no tienes recetas guardadas.</p>
          <p className="text-zinc-600 text-xs">Pulsa "+ Nueva" para crear tu primera receta.</p>
        </div>
      )}

      <div className="space-y-3">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{recipe.name}</p>
                <MacroRow
                  cal={recipe.totalCalories}
                  prot={recipe.totalProtein}
                  carbs={recipe.totalCarbs}
                  fat={recipe.totalFat}
                />
                <p className="text-xs text-zinc-600 mt-1">{recipe.items.length} ingrediente{recipe.items.length !== 1 ? "s" : ""}</p>
              </div>
              <button onClick={() => deleteRecipe(recipe.id)} className="text-zinc-600 hover:text-red-400 transition-colors mt-0.5">
                <Trash2 size={16} />
              </button>
            </div>

            {logSuccess === recipe.id && (
              <p className="text-green-400 text-xs mt-3 font-medium">✓ Registrado en el diario</p>
            )}

            {loggingId === recipe.id ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">¿En qué comida?</p>
                <div className="grid grid-cols-5 gap-1">
                  {MEALS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setLogMeal(m)}
                      className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${logMeal === m ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setLoggingId(null)} className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 text-sm font-semibold">
                    Cancelar
                  </button>
                  <button
                    onClick={() => logRecipe(recipe.id)}
                    disabled={logging}
                    className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-40"
                  >
                    {logging ? "..." : "Registrar"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { setLoggingId(recipe.id); setLogMeal("comida"); }}
                className="mt-3 w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-semibold hover:bg-zinc-700 transition-colors"
              >
                + Añadir al diario
              </button>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
