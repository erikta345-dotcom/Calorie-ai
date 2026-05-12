"use client";

import { Save, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ScanResult, type FoodItem } from "./types";

const MEALS = ["desayuno", "snack", "comida", "merienda", "cena", "picoteo"];
const PORTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
const PORTION_LABELS = ["½×", "¾×", "1×", "1½×", "2×"];

function macros(item: FoodItem, portionMult: number) {
  const f = (item.grams * portionMult) / 100;
  return {
    calories: Math.round(item.caloriesPer100g * f),
    protein: Math.round(item.proteinPer100g * f * 10) / 10,
    carbs: Math.round(item.carbsPer100g * f * 10) / 10,
    fat: Math.round(item.fatPer100g * f * 10) / 10,
  };
}

interface ScanTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
}

interface ScanResultCardProps {
  result: ScanResult;
  total: ScanTotal;
  portion: number;
  meal: string;
  saving: boolean;
  savingRecipe: boolean;
  itemGramsStr: Record<number, string>;
  onDishChange: (val: string) => void;
  onToggleItem: (idx: number) => void;
  onUpdateName: (idx: number, val: string) => void;
  onItemGramsStrChange: (updater: (prev: Record<number, string>) => Record<number, string>) => void;
  onUpdateGrams: (idx: number, val: number) => void;
  onPortionChange: (p: number) => void;
  onMealChange: (m: string) => void;
  onSave: () => void;
  onSaveToRecipe: () => void;
}

export default function ScanResultCard({
  result,
  total,
  portion,
  meal,
  saving,
  savingRecipe,
  itemGramsStr,
  onDishChange,
  onToggleItem,
  onUpdateName,
  onItemGramsStrChange,
  onUpdateGrams,
  onPortionChange,
  onMealChange,
  onSave,
  onSaveToRecipe,
}: ScanResultCardProps) {
  return (
    <div className="mt-4 space-y-3">
      <input
        value={result.dish}
        onChange={(e) => onDishChange(e.target.value)}
        className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-brand-500"
      />

      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
        {result.items.map((item, idx) => {
          const m = macros(item, portion);
          return (
            <div key={idx} className={`p-3 border-b border-gray-200 dark:border-zinc-800 last:border-0 ${!item.enabled ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  onClick={() => onToggleItem(idx)}
                  className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center text-xs font-bold transition-colors ${item.enabled ? "bg-brand-500 border-brand-500 text-white" : "border-zinc-600"}`}
                >
                  {item.enabled && "✓"}
                </button>
                <input value={item.name} onChange={(e) => onUpdateName(idx, e.target.value)} className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white focus:outline-none min-w-0" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={itemGramsStr[idx] ?? String(item.grams)}
                    onChange={(e) => {
                      if (e.target.value === "" || /^\d*$/.test(e.target.value))
                        onItemGramsStrChange((p) => ({ ...p, [idx]: e.target.value }));
                    }}
                    onBlur={() => {
                      const val = Math.max(1, parseInt(itemGramsStr[idx] ?? String(item.grams)) || 1);
                      onUpdateGrams(idx, val);
                      onItemGramsStrChange((p) => ({ ...p, [idx]: String(val) }));
                    }}
                    className="w-14 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-xs text-right rounded-lg px-2 py-1 focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs">g</span>
                </div>
              </div>
              <div className="flex gap-3 pl-7 text-xs">
                <span className="text-white font-semibold">{m.calories} kcal</span>
                <span className="text-orange-400">P {m.protein}g</span>
                <span className="text-blue-400">C {m.carbs}g</span>
                <span className="text-yellow-400">G {m.fat}g</span>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-xs text-zinc-500 mb-2">Tamaño de porción</p>
        <div className="flex gap-1.5">
          {PORTIONS.map((p, i) => (
            <button key={p} onClick={() => onPortionChange(p)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${portion === p ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>
              {PORTION_LABELS[i]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">Total{portion !== 1 ? ` · porción ×${portion}` : ""} · {total.grams}g</p>
        <div className="grid grid-cols-5 gap-1">
          {[{ label: "kcal", value: total.calories, color: "text-gray-900 dark:text-white" }, { label: "Prot", value: total.protein, color: "text-orange-400" }, { label: "Carb", value: total.carbs, color: "text-blue-400" }, { label: "Gras", value: total.fat, color: "text-yellow-400" }].map((m) => (
            <div key={m.label} className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-2 text-center">
              <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">¿En qué comida?</label>
        <div className="grid grid-cols-5 gap-1">
          {MEALS.map((m) => (
            <button key={m} onClick={() => onMealChange(m)} className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${meal === m ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>{m}</button>
          ))}
        </div>
      </div>

      <Button onClick={onSave} disabled={saving || total.calories === 0} className="w-full h-auto py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 gap-2">
        <Save size={16} />{saving ? "Guardando..." : `Añadir ${total.calories} kcal al diario`}
      </Button>
      <Button variant="outline" onClick={onSaveToRecipe} disabled={savingRecipe || total.calories === 0} className="w-full h-auto py-3 rounded-xl border-gray-300 dark:border-zinc-700 bg-transparent text-gray-600 dark:text-zinc-300 hover:border-brand-500 hover:text-gray-900 dark:hover:text-white hover:bg-transparent disabled:opacity-40 gap-2">
        <BookOpen size={16} />{savingRecipe ? "Guardando..." : "Guardar en recetas"}
      </Button>
    </div>
  );
}
