"use client";

import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import CalorieRing from "@/components/CalorieRing";
import MacroBar from "@/components/MacroBar";
import { Plus, Trash2, RotateCcw, Copy } from "lucide-react";

type FoodEntry = {
  id: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
  createdAt: string;
  note?: string;
};

type EditForm = { name: string; calories: string; protein: string; carbs: string; fat: string; grams: string; meal: string; note: string };

type Settings = {
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  mealTimes?: { desayuno?: string; comida?: string; merienda?: string; cena?: string; snack?: string };
};

const MEALS = ["desayuno", "snack", "comida", "merienda", "cena", "picoteo"];
const MEAL_ICONS: Record<string, string> = {
  desayuno: "🌅", comida: "☀️", merienda: "🍊", cena: "🌙", snack: "🍎", picoteo: "🫙",
};
const MEAL_COLORS: Record<string, string> = {
  desayuno: "border-l-amber-400",
  comida: "border-l-orange-400",
  merienda: "border-l-lime-400",
  cena: "border-l-indigo-400",
  snack: "border-l-pink-400",
  picoteo: "border-l-zinc-400",
};

const MEAL_BAR_COLORS: Record<string, string> = {
  desayuno: "bg-amber-400",
  comida: "bg-orange-400",
  merienda: "bg-lime-400",
  cena: "bg-indigo-400",
  snack: "bg-pink-400",
  picoteo: "bg-zinc-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [settings, setSettings] = useState<Settings>({
    goalCalories: 2800, goalProtein: 150, goalCarbs: 300, goalFat: 80,
  });
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [copyingYesterday, setCopyingYesterday] = useState(false);
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [copyingMeal, setCopyingMeal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/entries?date=${today}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
      fetch(`/api/streak?date=${today}`).then((r) => r.json()),
    ]).then(([ent, sett, str]) => {
      if (Array.isArray(ent)) setEntries(ent);
      if (sett && !sett.error) {
        const mealTimes = sett.mealTimes
          ? (typeof sett.mealTimes === "string" ? JSON.parse(sett.mealTimes) : sett.mealTimes)
          : undefined;
        setSettings({ ...sett, mealTimes });
      }
      if (str && !str.error) setStreaks({ calories: str.calories ?? 0, protein: str.protein ?? 0, carbs: str.carbs ?? 0, fat: str.fat ?? 0 });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [today]);

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function openEdit(entry: FoodEntry) {
    setEditEntry(entry);
    setEditForm({ name: entry.name, calories: String(entry.calories), protein: String(entry.protein), carbs: String(entry.carbs), fat: String(entry.fat), grams: String(entry.grams), meal: entry.meal, note: entry.note || "" });
  }

  async function saveEdit() {
    if (!editEntry || !editForm) return;
    setEditSaving(true);
    const res = await fetch(`/api/entries/${editEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, calories: parseFloat(editForm.calories), protein: parseFloat(editForm.protein), carbs: parseFloat(editForm.carbs), fat: parseFloat(editForm.fat), grams: parseFloat(editForm.grams) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === editEntry.id ? updated : e)));
      setEditEntry(null);
      setEditForm(null);
    }
    setEditSaving(false);
  }

  async function copyYesterday() {
    setCopyingYesterday(true);
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const res = await fetch(`/api/entries?date=${yesterday}`);
    if (!res.ok) { setCopyingYesterday(false); return; }
    const yesterdayEntries: FoodEntry[] = await res.json();
    if (!yesterdayEntries.length) { setCopyingYesterday(false); return; }
    const created = await Promise.all(
      yesterdayEntries.map((e) =>
        fetch("/api/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: today, meal: e.meal, name: e.name, calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat, grams: e.grams, source: "manual" }),
        }).then((r) => r.ok ? r.json() : null)
      )
    );
    setEntries((prev) => [...prev, ...created.filter(Boolean)]);
    setCopyingYesterday(false);
  }

  async function relogEntry(entry: FoodEntry) {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, meal: entry.meal, name: entry.name, calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, grams: entry.grams, source: "manual", createdAt: new Date().toISOString(), note: entry.note }),
    });
    if (res.ok) {
      const created = await res.json();
      setEntries((prev) => [...prev, created]);
    }
  }

  async function copyMealFromYesterday(meal: string) {
    setCopyingMeal((prev) => ({ ...prev, [meal]: true }));
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const res = await fetch(`/api/entries?date=${yesterday}`);
    if (res.ok) {
      const all: FoodEntry[] = await res.json();
      const mealEntries = all.filter((e) => e.meal === meal);
      if (mealEntries.length) {
        const created = await Promise.all(
          mealEntries.map((e) =>
            fetch("/api/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ date: today, meal: e.meal, name: e.name, calories: e.calories, protein: e.protein, carbs: e.carbs, fat: e.fat, grams: e.grams, source: "manual", createdAt: new Date().toISOString(), note: e.note }),
            }).then((r) => r.ok ? r.json() : null)
          )
        );
        setEntries((prev) => [...prev, ...created.filter(Boolean)]);
      }
    }
    setCopyingMeal((prev) => ({ ...prev, [meal]: false }));
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-md mx-auto pb-32">
      {/* Header */}
      <header className="px-4 pt-14 pb-5 flex items-end justify-between">
        <div>
          <p className="text-gray-400 dark:text-zinc-500 text-xs uppercase tracking-widest font-medium capitalize">
            {format(new Date(), "EEEE, d MMMM", { locale: es })}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">Hoy</h1>
        </div>
        <button
          onClick={copyYesterday}
          disabled={copyingYesterday}
          className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 mb-1"
        >
          {copyingYesterday ? "Copiando..." : "📋 Copiar ayer"}
        </button>
      </header>

      {/* Calorie Ring + Macros */}
      <div className="mx-4 bg-gradient-to-br from-gray-50 to-gray-50/80 dark:from-zinc-900 dark:to-zinc-900/80 rounded-2xl p-5 border border-gray-200/80 dark:border-zinc-800/80 shadow-xl shadow-black/5 dark:shadow-black/30">
        <div className="flex items-center gap-5">
          <CalorieRing consumed={totals.calories} goal={settings.goalCalories} />
          <div className="flex-1 space-y-3.5">
            <MacroBar label="Proteína" consumed={totals.protein} goal={settings.goalProtein} color="#f97316" />
            <MacroBar label="Carbos" consumed={totals.carbs} goal={settings.goalCarbs} color="#3b82f6" />
            <MacroBar label="Grasa" consumed={totals.fat} goal={settings.goalFat} color="#eab308" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200/60 dark:border-zinc-800/60 flex justify-between items-center">
          <span className="text-xs text-gray-400 dark:text-zinc-500">{Math.round(totals.calories)} consumidas</span>
          <span className={`text-xl font-bold ${totals.calories > settings.goalCalories ? "text-orange-400" : "text-green-400"}`}>
            {totals.calories > settings.goalCalories
              ? `+${Math.round(totals.calories - settings.goalCalories)}`
              : Math.max(0, settings.goalCalories - Math.round(totals.calories))}
            <span className="text-xs font-normal text-gray-400 dark:text-zinc-500 ml-1">
              {totals.calories > settings.goalCalories ? "exceso" : "restantes"}
            </span>
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {[
            { emoji: "🔥", label: "Kcal", value: streaks.calories, cls: "text-orange-400 bg-orange-400/10" },
            { emoji: "🥩", label: "Prot", value: streaks.protein, cls: "text-orange-300 bg-orange-300/10" },
            { emoji: "🍞", label: "Carbs", value: streaks.carbs, cls: "text-blue-400 bg-blue-400/10" },
            { emoji: "🫒", label: "Gras", value: streaks.fat, cls: "text-yellow-400 bg-yellow-400/10" },
          ].map(({ emoji, label, value, cls }) => (
            <div key={label} className={`${cls} rounded-xl px-2 py-1.5 text-center`}>
              <p className="text-base leading-none">{emoji}</p>
              <p className={`text-sm font-bold mt-1 ${cls.split(" ")[0]}`}>{value}</p>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">{value === 1 ? "día" : "días"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Meal blocks */}
      <div className="px-4 mt-5 space-y-2.5">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[60px] rounded-xl bg-gray-100/50 dark:bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : (
          MEALS.map((meal) => {
            const mealEntries = entriesByMeal(meal);
            const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
            return (
              <div key={meal} className={`bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200/60 dark:border-zinc-800/60 border-l-2 ${MEAL_COLORS[meal]} overflow-hidden`}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{MEAL_ICONS[meal]}</span>
                    <div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white capitalize">{meal}</span>
                      {settings.mealTimes?.[meal as keyof typeof settings.mealTimes] && (
                        <span className="ml-2 text-[11px] text-gray-400 dark:text-zinc-500">{settings.mealTimes[meal as keyof typeof settings.mealTimes]}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {mealCals > 0 && (
                      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">{Math.round(mealCals)} kcal</span>
                    )}
                    <button
                      onClick={() => copyMealFromYesterday(meal)}
                      disabled={copyingMeal[meal]}
                      title="Copiar de ayer"
                      className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 flex items-center justify-center transition-colors disabled:opacity-40"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={() => router.push(`/search?meal=${meal}`)}
                      className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-brand-500 text-gray-500 dark:text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
                {mealCals > 0 && (
                  <div className="h-0.5 mx-4 mb-1 bg-gray-200/60 dark:bg-zinc-800/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${MEAL_BAR_COLORS[meal]}`}
                      style={{ width: `${Math.min((mealCals / settings.goalCalories) * 100, 100)}%` }}
                    />
                  </div>
                )}
                {mealEntries.length > 0 && (
                  <div className="border-t border-gray-200/60 dark:border-zinc-800/60">
                    {mealEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/40 dark:border-zinc-800/40 last:border-0"
                      >
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm text-gray-700 dark:text-zinc-200 truncate cursor-pointer hover:text-gray-900 dark:hover:text-white" onClick={() => openEdit(entry)}>{entry.name}</p>
                          {entry.note && <p className="text-[11px] text-gray-400 dark:text-zinc-500 italic mt-0.5 truncate">{entry.note}</p>}
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                            {entry.createdAt ? new Date(entry.createdAt.includes("T") || entry.createdAt.endsWith("Z") ? entry.createdAt : entry.createdAt.replace(" ", "T") + "Z").toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : ""}{entry.createdAt ? " · " : ""}{entry.grams}g · P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · G {Math.round(entry.fat)}g
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">{Math.round(entry.calories)} kcal</span>
                          <button
                            onClick={() => relogEntry(entry)}
                            title="Volver a añadir"
                            className="text-gray-300 dark:text-zinc-600 hover:text-brand-500 transition-colors"
                          >
                            <RotateCcw size={13} />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-gray-300 dark:text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mealEntries.length === 0 && (
                  <p className="px-4 pb-3 text-[11px] text-gray-300 dark:text-zinc-600">Sin alimentos registrados</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {editEntry && editForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => { setEditEntry(null); setEditForm(null); }}>
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-t-2xl w-full max-w-md p-5 pb-8 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-gray-900 dark:text-white font-semibold text-base">Editar entrada</h2>
            <input className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nombre" />
            <input className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-zinc-600" value={editForm.note} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} placeholder="Nota (opcional)" maxLength={300} />
            <div className="grid grid-cols-2 gap-2">
              {(["calories", "protein", "carbs", "fat", "grams"] as const).map((k) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1 capitalize">{k === "calories" ? "kcal" : k === "grams" ? "gramos" : k}</p>
                  <input type="number" className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm" value={editForm[k]} onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })} />
                </div>
              ))}
              <div>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Comida</p>
                <select className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm" value={editForm.meal} onChange={(e) => setEditForm({ ...editForm, meal: e.target.value })}>
                  {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveEdit} disabled={editSaving} className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40">
              {editSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
