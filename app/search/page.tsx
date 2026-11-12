"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import PageShell from "@/components/PageShell";
import MealPicker from "@/components/MealPicker";
import { useSuggestedMeal } from "@/hooks/useSuggestedMeal";

type FoodResult = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source?: string;
};

type RecentFood = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type Tab = "search" | "manual";

function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => {
        if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) onChange(e.target.value);
      }}
      onBlur={() => {
        const n = parseFloat(value);
        if (isNaN(n) || n < 0) onChange("0");
      }}
      className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-center text-xl font-bold rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
    />
  );
}

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forcedMeal = searchParams.get("meal");
  const [tab, setTab] = useState<Tab>("search");
  const { meal: suggestedMeal, loaded: mealLoaded } = useSuggestedMeal();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [gramsStr, setGramsStr] = useState("100");
  const [meal, setMeal] = useState(suggestedMeal);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const [mName, setMName] = useState("");
  const [mCal, setMCal] = useState("");
  const [mProtein, setMProtein] = useState("");
  const [mCarbs, setMCarbs] = useState("");
  const [mFat, setMFat] = useState("");
  const [mGrams, setMGrams] = useState("100");
  const [mMeal, setMMeal] = useState(suggestedMeal);
  const [mSaving, setMSaving] = useState(false);
  const [mError, setMError] = useState("");
  const [mNote, setMNote] = useState("");

  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<RecentFood[]>([]);

  useEffect(() => {
    try {
      const r = localStorage.getItem("recent-foods");
      if (r) setRecentFoods(JSON.parse(r));
      const f = localStorage.getItem("favorite-foods");
      if (f) setFavoriteFoods(JSON.parse(f));
    } catch {}
  }, []);

  useEffect(() => {
    if (forcedMeal) {
      setMeal(forcedMeal);
      setMMeal(forcedMeal);
    } else if (mealLoaded) {
      setMeal(suggestedMeal);
      setMMeal(suggestedMeal);
    }
  }, [forcedMeal, mealLoaded, suggestedMeal]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (tab !== "search" || selected) {
      setLoading(false);
      return;
    }
    if (normalizedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setSearchError("");
      return;
    }

    setLoading(true);
    setResults([]);
    setSearchError("");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(normalizedQuery)}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Search request failed");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid search response");
        setResults(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError("No se pudo buscar. Comprueba tu conexión e inténtalo de nuevo.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, tab, selected, searchTrigger]);

  function saveToRecent(food: RecentFood) {
    setRecentFoods((prev) => {
      const filtered = prev.filter((f) => f.id !== food.id);
      const next = [food, ...filtered].slice(0, 10);
      localStorage.setItem("recent-foods", JSON.stringify(next));
      return next;
    });
  }

  function toggleFavorite(food: RecentFood) {
    setFavoriteFoods((prev) => {
      const exists = prev.some((f) => f.id === food.id);
      const next = exists ? prev.filter((f) => f.id !== food.id) : [food, ...prev];
      localStorage.setItem("favorite-foods", JSON.stringify(next));
      return next;
    });
  }

  function isFavorite(id: string) {
    return favoriteFoods.some((f) => f.id === id);
  }

  const grams = Math.max(1, parseFloat(gramsStr) || 1);

  async function handleSave() {
    if (!selected || grams < 1) return;
    setSaving(true);
    setError("");
    const factor = grams / 100;
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          calories: selected.calories * factor,
          protein: selected.protein * factor,
          carbs: selected.carbs * factor,
          fat: selected.fat * factor,
          grams,
          meal,
          date: today,
          source: "search",
          createdAt: new Date().toISOString(),
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      saveToRecent({ id: selected.id, name: selected.name, calories: selected.calories, protein: selected.protein, carbs: selected.carbs, fat: selected.fat });
      router.push("/");
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecentAdd(food: RecentFood) {
    setSaving(true);
    setError("");
    const today = format(new Date(), "yyyy-MM-dd");
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          grams: 100,
          meal,
          date: today,
          source: "search",
          createdAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      saveToRecent(food);
      router.push("/");
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleManualSave() {
    const cal = parseFloat(mCal);
    if (!mName.trim() || isNaN(cal) || cal <= 0) {
      setMError("Nombre y calorías son obligatorios.");
      return;
    }
    setMSaving(true);
    setMError("");
    const today = format(new Date(), "yyyy-MM-dd");
    const g = Math.max(1, parseFloat(mGrams) || 100);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: mName.trim(),
          calories: cal,
          protein: parseFloat(mProtein) || 0,
          carbs: parseFloat(mCarbs) || 0,
          fat: parseFloat(mFat) || 0,
          grams: g,
          meal: mMeal,
          date: today,
          source: "manual",
          createdAt: new Date().toISOString(),
          note: mNote.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setMError("Error al guardar. Intenta de nuevo.");
    } finally {
      setMSaving(false);
    }
  }

  const adjusted = selected
    ? {
        calories: (selected.calories * grams) / 100,
        protein: (selected.protein * grams) / 100,
        carbs: (selected.carbs * grams) / 100,
        fat: (selected.fat * grams) / 100,
      }
    : null;

  const sortedRecent = [
    ...recentFoods.filter((f) => isFavorite(f.id)),
    ...recentFoods.filter((f) => !isFavorite(f.id)),
  ];

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🍴 Añadir comida</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-zinc-900 rounded-xl p-1 mb-4">
        <button
          onClick={() => setTab("search")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === "search" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"}`}
        >
          🔍 Buscar
        </button>
        <button
          onClick={() => setTab("manual")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tab === "manual" ? "bg-brand-500 text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"}`}
        >
          ✏️ Manual
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearchTrigger((n) => n + 1)}
              placeholder="Ej: pollo a la plancha..."
              aria-label="Buscar alimentos"
              autoComplete="off"
              className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => setSearchTrigger((n) => n + 1)}
              disabled={loading || query.trim().length < 2}
              className="px-4 py-3 bg-brand-500 text-white rounded-xl font-semibold disabled:opacity-40"
            >
              {loading ? "Buscando…" : "Buscar"}
            </button>
          </div>

          {query.trim().length < 2 && query.trim().length > 0 && !selected && (
            <p className="mt-2 text-xs text-gray-400 dark:text-zinc-500">Escribe al menos 2 caracteres para buscar.</p>
          )}
          {searchError && !selected && <p role="status" className="mt-3 text-center text-sm text-red-400">{searchError}</p>}
          {loading && !selected && <p role="status" className="mt-4 text-center text-sm text-gray-400 dark:text-zinc-500">Buscando alimentos…</p>}

          {!query && !selected && sortedRecent.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">Recientes</p>
              {sortedRecent.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3"
                >
                  <button
                    onClick={() => handleRecentAdd(food)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {isFavorite(food.id) && <span className="mr-1">⭐</span>}
                      {food.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {Math.round(food.calories)} kcal · P: {Math.round(food.protein)}g · C: {Math.round(food.carbs)}g · G: {Math.round(food.fat)}g
                      <span className="text-gray-300 dark:text-zinc-600"> /100g</span>
                    </p>
                  </button>
                  <button
                    onClick={() => toggleFavorite(food)}
                    className="text-lg leading-none shrink-0"
                  >
                    {isFavorite(food.id) ? "❤️" : "🤍"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {results.length > 0 && !selected && (
            <div className="mt-4 space-y-2">
              {results.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 hover:border-brand-500 transition-colors"
                >
                  <button
                    onClick={() => { setSelected(food); setGramsStr("100"); }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {food.source === "es-curado" && <span className="mr-1">🇪🇸</span>}
                      {food.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      {Math.round(food.calories)} kcal · P: {Math.round(food.protein)}g · C: {Math.round(food.carbs)}g · G: {Math.round(food.fat)}g
                      <span className="text-gray-300 dark:text-zinc-600"> /100g</span>
                    </p>
                  </button>
                  <button
                    onClick={() => toggleFavorite({ id: food.id, name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat })}
                    className="text-lg leading-none shrink-0"
                  >
                    {isFavorite(food.id) ? "❤️" : "🤍"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !loading && !searchError && query.trim().length >= 2 && !selected && (
            <p className="text-center text-gray-300 dark:text-zinc-600 text-sm mt-8">Sin resultados para "{query}"</p>
          )}

          {selected && adjusted && (
            <div className="mt-4 space-y-4">
              <button onClick={() => setSelected(null)} className="text-gray-400 dark:text-zinc-500 text-sm">
                ← Volver a resultados
              </button>
              <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">{selected.name}</h2>
                <div>
                  <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">Cantidad (gramos)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={gramsStr}
                    onChange={(e) => {
                      if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setGramsStr(e.target.value);
                    }}
                    onBlur={() => setGramsStr(String(Math.max(1, parseFloat(gramsStr) || 1)))}
                    className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-center text-xl font-bold rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { label: "kcal", value: adjusted.calories, color: "text-brand-400" },
                    { label: "Prot", value: adjusted.protein, color: "text-orange-400" },
                    { label: "Carb", value: adjusted.carbs, color: "text-blue-400" },
                    { label: "Gras", value: adjusted.fat, color: "text-yellow-400" },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-2 text-center">
                      <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">¿En qué comida?</label>
                <MealPicker value={meal} onChange={setMeal} />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">Nota (opcional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: post-entreno, estimado..."
                  maxLength={300}
                  className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40">
                {saving ? "Guardando..." : "💾 Añadir al diario"}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "manual" && (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-1.5">Nombre del alimento *</label>
              <input
                value={mName}
                onChange={(e) => setMName(e.target.value)}
                placeholder="Ej: Tortilla de patatas"
                className="w-full bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-1.5">Calorías (kcal) *</label>
                <NumInput value={mCal} onChange={setMCal} />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-1.5">Gramos</label>
                <NumInput value={mGrams} onChange={setMGrams} />
              </div>
            </div>

            <p className="text-xs text-gray-300 dark:text-zinc-600">Macros opcionales</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Proteína (g)", val: mProtein, set: setMProtein },
                { label: "Carbos (g)", val: mCarbs, set: setMCarbs },
                { label: "Grasas (g)", val: mFat, set: setMFat },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-1.5">{label}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={val}
                    placeholder="0"
                    onChange={(e) => {
                      if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) set(e.target.value);
                    }}
                    className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-center rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">¿En qué comida?</label>
            <MealPicker value={mMeal} onChange={setMMeal} />
          </div>

          <div>
            <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">Nota (opcional)</label>
            <input
              value={mNote}
              onChange={(e) => setMNote(e.target.value)}
              placeholder="Ej: post-entreno, estimado..."
              maxLength={300}
              className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {mError && <p className="text-red-400 text-sm text-center">{mError}</p>}
          <button
            onClick={handleManualSave}
            disabled={mSaving || !mName.trim() || !mCal}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40"
          >
            {mSaving ? "Guardando..." : "💾 Añadir al diario"}
          </button>
        </div>
      )}

    </PageShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
