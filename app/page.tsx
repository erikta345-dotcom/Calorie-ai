"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BottomNav from "@/components/BottomNav";
import CalorieRing from "@/components/CalorieRing";
import MacroBar from "@/components/MacroBar";

type FoodEntry = {
  id: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
};

type Settings = {
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
};

const MEALS = ["desayuno", "almuerzo", "cena", "snack"];
const MEAL_ICONS: Record<string, string> = {
  desayuno: "🌅", almuerzo: "☀️", cena: "🌙", snack: "🍎",
};

export default function DashboardPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({
    goalCalories: 2800, goalProtein: 150, goalCarbs: 300, goalFat: 80,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/entries?date=${today}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([ent, sett]) => {
      if (Array.isArray(ent)) setEntries(ent);
      if (sett && !sett.error) setSettings(sett);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [today]);

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const totals = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const entriesByMeal = (meal: string) => entries.filter((e) => e.meal === meal);

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32">
      {/* Header */}
      <header className="px-4 pt-14 pb-4">
        <p className="text-zinc-500 text-sm capitalize">
          {format(new Date(), "EEEE, d MMMM", { locale: es })}
        </p>
        <h1 className="text-2xl font-bold text-white">Hoy</h1>
      </header>

      {/* Calorie Ring + Macros */}
      <div className="mx-4 bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <div className="flex items-center gap-4">
          <CalorieRing consumed={totals.calories} goal={settings.goalCalories} />
          <div className="flex-1 space-y-3">
            <MacroBar label="Proteína" consumed={totals.protein} goal={settings.goalProtein} color="#f97316" />
            <MacroBar label="Carbos" consumed={totals.carbs} goal={settings.goalCarbs} color="#3b82f6" />
            <MacroBar label="Grasa" consumed={totals.fat} goal={settings.goalFat} color="#eab308" />
          </div>
        </div>
      </div>

      {/* Comidas por bloque */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : (
          MEALS.map((meal) => {
            const mealEntries = entriesByMeal(meal);
            const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
            return (
              <div key={meal} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{MEAL_ICONS[meal]}</span>
                    <span className="font-semibold text-white capitalize">{meal}</span>
                  </div>
                  <span className="text-sm text-zinc-400">{Math.round(mealCals)} kcal</span>
                </div>
                {mealEntries.length > 0 && (
                  <div className="border-t border-zinc-800">
                    {mealEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-zinc-200">{entry.name}</p>
                          <p className="text-xs text-zinc-500">
                            {entry.grams}g · P: {Math.round(entry.protein)}g · C: {Math.round(entry.carbs)}g · G: {Math.round(entry.fat)}g
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-300">{Math.round(entry.calories)}</span>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-zinc-600 hover:text-red-400 text-lg"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mealEntries.length === 0 && (
                  <p className="px-4 pb-3 text-xs text-zinc-600">Sin alimentos</p>
                )}
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
