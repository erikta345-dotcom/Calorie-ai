"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

type FoodResult = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const MEALS = ["desayuno", "almuerzo", "cena", "snack"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [grams, setGrams] = useState(100);
  const [meal, setMeal] = useState("almuerzo");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

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
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
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

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">🔍 Buscar alimento</h1>
        <p className="text-zinc-500 text-sm mt-1">Base de datos Open Food Facts</p>
      </header>

      {/* Buscador */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Ej: pollo a la plancha..."
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-3 bg-brand-500 text-white rounded-xl font-semibold disabled:opacity-40"
        >
          {loading ? "..." : "Buscar"}
        </button>
      </div>

      {/* Resultados */}
      {results.length > 0 && !selected && (
        <div className="mt-4 space-y-2">
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => setSelected(food)}
              className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-brand-500 transition-colors"
            >
              <p className="text-sm font-medium text-white">{food.name}</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {Math.round(food.calories)} kcal · P: {Math.round(food.protein)}g · C: {Math.round(food.carbs)}g · G: {Math.round(food.fat)}g
                <span className="text-zinc-600"> /100g</span>
              </p>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && query && (
        <p className="text-center text-zinc-600 text-sm mt-8">Sin resultados para "{query}"</p>
      )}

      {/* Detalle del seleccionado */}
      {selected && adjusted && (
        <div className="mt-4 space-y-4">
          <button onClick={() => setSelected(null)} className="text-zinc-500 text-sm">
            ← Volver a resultados
          </button>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-white">{selected.name}</h2>

            {/* Gramos */}
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Cantidad (gramos)</label>
              <input
                type="number"
                value={grams}
                onChange={(e) => setGrams(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full bg-zinc-800 text-white text-center text-xl font-bold rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Macros ajustados */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "kcal", value: adjusted.calories, color: "text-brand-400" },
                { label: "Prot", value: adjusted.protein, color: "text-orange-400" },
                { label: "Carb", value: adjusted.carbs, color: "text-blue-400" },
                { label: "Gras", value: adjusted.fat, color: "text-yellow-400" },
              ].map((m) => (
                <div key={m.label} className="bg-zinc-800 rounded-lg p-2 text-center">
                  <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selector comida */}
          <div>
            <label className="text-xs text-zinc-500 block mb-2">¿En qué comida?</label>
            <div className="grid grid-cols-4 gap-2">
              {MEALS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    meal === m ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40"
          >
            {saving ? "Guardando..." : "💾 Añadir al diario"}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
