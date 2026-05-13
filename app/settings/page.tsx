"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import type { MealTimes } from "@/hooks/useSuggestedMeal";
import { subscribeAndSave } from "@/components/MealNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type Settings = {
  weight: number;
  height: number;
  age: number;
  gender: "male" | "female";
  goal: "maintain" | "lose_fat" | "gain_muscle";
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  mealTimes: MealTimes;
};

const PLANS: { id: Settings["goal"]; emoji: string; label: string; desc: string }[] = [
  { id: "maintain", emoji: "⚖️", label: "Mantener", desc: "Mismo peso" },
  { id: "lose_fat", emoji: "🔥", label: "Perder grasa", desc: "Déficit calórico" },
  { id: "gain_muscle", emoji: "💪", label: "Ganar músculo", desc: "Superávit" },
];

function calcMacros(weight: number, height: number, age: number, gender: Settings["gender"], goal: Settings["goal"]) {
  const sexOffset = gender === "male" ? 5 : -161;
  const bmr = 10 * weight + 6.25 * Math.max(height, 100) - 5 * Math.max(age, 1) + sexOffset;
  const tdee = Math.round(bmr * 1.55);
  if (goal === "lose_fat") {
    const cal = Math.round(tdee * 0.82);
    return { goalCalories: cal, goalProtein: Math.round(weight * 2.2), goalCarbs: Math.round((cal * 0.35) / 4), goalFat: Math.round((cal * 0.30) / 9) };
  }
  if (goal === "gain_muscle") {
    const cal = Math.round(tdee * 1.15);
    return { goalCalories: cal, goalProtein: Math.round(weight * 2.2), goalCarbs: Math.round((cal * 0.50) / 4), goalFat: Math.round((cal * 0.25) / 9) };
  }
  return { goalCalories: tdee, goalProtein: Math.round(weight * 1.8), goalCarbs: Math.round((tdee * 0.45) / 4), goalFat: Math.round((tdee * 0.25) / 9) };
}

const DEFAULT_MEAL_TIMES: MealTimes = {
  desayuno: "08:00",
  comida: "13:30",
  merienda: "17:00",
  cena: "20:30",
  snack: "11:00",
};

const MEAL_LABELS: Record<keyof MealTimes, string> = {
  desayuno: "🌅 Desayuno",
  snack: "🍎 Snack",
  comida: "☀️ Comida",
  merienda: "🍊 Merienda",
  cena: "🌙 Cena",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState<Settings>({
    weight: 75,
    height: 0,
    age: 25,
    gender: "male",
    goal: "maintain",
    goalCalories: 2635,
    goalProtein: 135,
    goalCarbs: 297,
    goalFat: 73,
    mealTimes: DEFAULT_MEAL_TIMES,
  });
  const [rawValues, setRawValues] = useState<Record<string, string>>({ height: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [weightLog, setWeightLog] = useState<{ date: string; weight: number }[]>([]);
  const [weightInput, setWeightInput] = useState("");
  const [weightSaving, setWeightSaving] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (!s) return;
        const mealTimes = s.mealTimes
          ? (typeof s.mealTimes === "string" ? JSON.parse(s.mealTimes) : s.mealTimes)
          : DEFAULT_MEAL_TIMES;
        const height = s.height || 0;
        setForm({ ...s, height, age: s.age ?? 25, gender: s.gender ?? "male", goal: s.goal ?? "maintain", mealTimes: { ...DEFAULT_MEAL_TIMES, ...mealTimes } });
        if (height) setRawValues((r) => { const n = { ...r }; delete n.height; return n; });
      });
    fetch("/api/weight")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWeightLog(data); });
  }, []);

  function handleBodyChange(patch: Partial<Pick<Settings, "weight" | "height" | "age" | "gender" | "goal">>) {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, ...calcMacros(next.weight, next.height, next.age, next.gender, next.goal) };
    });
  }

  async function logWeight() {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 20 || w > 500) return;
    setWeightSaving(true);
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, weight: w }),
    });
    if (res.ok) {
      const entry = await res.json();
      setWeightLog((prev) => {
        const filtered = prev.filter((e) => e.date !== entry.date);
        return [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
      });
      setWeightInput("");
    }
    setWeightSaving(false);
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, height: form.height || 50 }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.dispatchEvent(new CustomEvent("meal-times-updated"));
  }

  const bmi = form.height > 0 ? form.weight / Math.pow(form.height / 100, 2) : null;
  const bmiLabel = bmi ? (bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obesidad") : null;
  const sexOffset = form.gender === "male" ? 5 : -161;
  const tdee = Math.round((10 * form.weight + 6.25 * Math.max(form.height, 100) - 5 * Math.max(form.age, 1) + sexOffset) * 1.55);

  const numField = (label: string, key: keyof Omit<Settings, "mealTimes" | "goal" | "gender">, unit: string, step = "any") => (
    <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 dark:text-zinc-500">{unit}</p>
      </div>
      <input
        type="number"
        step={step}
        value={rawValues[key] ?? String(form[key] as number)}
        onChange={(e) => {
          const raw = e.target.value;
          setRawValues((r) => ({ ...r, [key]: raw }));
          const val = parseFloat(raw);
          if (!Number.isFinite(val)) return;
          if (key === "weight") handleBodyChange({ weight: Math.max(1, val) });
          else if (key === "height") handleBodyChange({ height: Math.max(1, val) });
          else if (key === "age") handleBodyChange({ age: Math.max(1, Math.round(val)) });
          else setForm((f) => ({ ...f, [key]: val }));
        }}
        onBlur={() => setRawValues((r) => { const n = { ...r }; delete n[key]; return n; })}
        className="w-24 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-right rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚙️ Configuración</h1>
          <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">Ajusta tus objetivos y horarios</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full ring-2 ring-gray-300 dark:ring-zinc-700 hover:ring-brand-500 transition-all focus:outline-none">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                <AvatarFallback className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white">
            <DropdownMenuLabel className="text-gray-400 dark:text-zinc-400 font-normal text-xs">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{session?.user?.name}</p>
              <p className="truncate text-gray-400 dark:text-zinc-500">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-200 dark:bg-zinc-800" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-400 focus:text-red-400 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer"
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-4">
        {/* Theme toggle */}
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Apariencia</p>
          <ThemeToggle />
        </div>

        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Tu cuerpo</p>
          {numField("Peso corporal", "weight", "kg", "0.1")}
          {numField("Altura", "height", "cm", "1")}
          {numField("Edad", "age", "años", "1")}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-zinc-800">
            <p className="text-sm text-gray-900 dark:text-white">Sexo</p>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => handleBodyChange({ gender: g })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.gender === g ? "bg-brand-500 text-zinc-950" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {g === "male" ? "Hombre" : "Mujer"}
                </button>
              ))}
            </div>
          </div>
          {bmi && (
            <div className="flex items-center justify-between py-3 border-t border-gray-200 dark:border-zinc-800">
              <p className="text-sm text-gray-500 dark:text-zinc-400">IMC</p>
              <div className="text-right">
                <span className="text-sm text-gray-900 dark:text-white font-medium">{bmi.toFixed(1)}</span>
                <span className={`ml-2 text-xs ${bmi < 18.5 || bmi >= 30 ? "text-yellow-400" : "text-green-400"}`}>{bmiLabel}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 pt-3 pb-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 pb-3 font-semibold uppercase tracking-wide">Objetivo</p>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleBodyChange({ goal: plan.id })}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-colors ${
                  form.goal === plan.id
                    ? "border-brand-500 bg-brand-500/10 text-gray-900 dark:text-white"
                    : "border-gray-200 dark:border-zinc-800 bg-gray-100/50 dark:bg-zinc-800/50 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"
                }`}
              >
                <span className="text-xl">{plan.emoji}</span>
                <span className="text-xs font-medium">{plan.label}</span>
                <span className="text-[10px] text-gray-300 dark:text-zinc-600">{plan.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Macros diarios</p>
          {numField("Calorías", "goalCalories", "kcal/día", "1")}
          {numField("Proteína", "goalProtein", "g/día", "0.1")}
          {numField("Carbohidratos", "goalCarbs", "g/día", "0.1")}
          {numField("Grasa", "goalFat", "g/día", "0.1")}
        </div>

        {/* Weight log */}
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 pt-3 pb-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 pb-3 font-semibold uppercase tracking-wide">📈 Evolución de peso</p>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              step="0.1"
              placeholder="Peso hoy (kg)"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              onClick={logWeight}
              disabled={weightSaving}
              className="px-4 py-2 rounded-lg bg-brand-500 text-zinc-950 font-semibold text-sm disabled:opacity-40"
            >
              {weightSaving ? "..." : "Añadir"}
            </button>
          </div>
          {weightLog.length >= 2 ? (() => {
            const W = 320; const H = 100; const PAD = 8;
            const weights = weightLog.map((e) => e.weight);
            const min = Math.min(...weights) - 1;
            const max = Math.max(...weights) + 1;
            const xStep = (W - PAD * 2) / (weightLog.length - 1);
            const yScale = (H - PAD * 2) / (max - min);
            const points = weightLog.map((e, i) => `${PAD + i * xStep},${H - PAD - (e.weight - min) * yScale}`).join(" ");
            const last = weightLog[weightLog.length - 1];
            const first = weightLog[0];
            const diff = last.weight - first.weight;
            return (
              <div>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 100 }}>
                  <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
                  {weightLog.map((e, i) => (
                    <circle key={e.date} cx={PAD + i * xStep} cy={H - PAD - (e.weight - min) * yScale} r="3" fill="#22c55e" />
                  ))}
                </svg>
                <div className="flex justify-between text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
                  <span>{first.date.slice(5)}</span>
                  <span className={diff < 0 ? "text-green-400" : diff > 0 ? "text-red-400" : "text-gray-400 dark:text-zinc-400"}>
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
                  </span>
                  <span>{last.date.slice(5)} · {last.weight} kg</span>
                </div>
              </div>
            );
          })() : (
            <p className="text-xs text-gray-300 dark:text-zinc-600 text-center py-2">Registra al menos 2 días para ver la gráfica</p>
          )}
        </div>

        {/* Meal times */}
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4">
          <div className="flex items-center justify-between pt-3 pb-1">
            <p className="text-xs text-gray-400 dark:text-zinc-500 font-semibold uppercase tracking-wide">Horario de comidas</p>
            {notifPerm !== "granted" ? (
              <button
                onClick={async () => {
                  if (!("Notification" in window)) return;
                  const perm = await Notification.requestPermission();
                  setNotifPerm(perm);
                  if (perm === "granted") {
                    try {
                      await subscribeAndSave();
                    } catch (err) {
                      console.error("subscribeAndSave failed:", err);
                    }
                  }
                }}
                className="text-xs bg-brand-500 text-white px-3 py-1 rounded-lg font-medium"
              >
                🔔 Activar avisos
              </button>
            ) : (
              <button
                onClick={async () => {
                  const reg = await navigator.serviceWorker.ready;
                  reg.showNotification("✅ Calorie AI", { body: "Notificaciones funcionando correctamente", icon: "/icons/icon-192.png" });
                }}
                className="text-xs text-green-400 underline"
              >
                🔔 Avisos activos · probar
              </button>
            )}
          </div>
          <p className="text-xs text-gray-300 dark:text-zinc-600 pb-2">Notificación cuando llegue la hora</p>
          {(Object.keys(MEAL_LABELS) as (keyof MealTimes)[]).map((meal) => (
            <div key={meal} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-zinc-800 last:border-0">
              <p className="text-sm text-gray-900 dark:text-white">{MEAL_LABELS[meal]}</p>
              <input
                type="time"
                value={form.mealTimes[meal] || DEFAULT_MEAL_TIMES[meal]}
                onChange={(e) =>
                  setForm({ ...form, mealTimes: { ...form.mealTimes, [meal]: e.target.value } })
                }
                className="bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50/50 dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 dark:text-zinc-500 leading-relaxed">
            {form.goal === "lose_fat" && <>💡 <span className="text-gray-500 dark:text-zinc-400">Déficit de ~{tdee - form.goalCalories} kcal/día</span> respecto a tu TDEE ({tdee} kcal). Alta proteína ({form.goalProtein}g) para preservar músculo.</>}
            {form.goal === "gain_muscle" && <>💡 <span className="text-gray-500 dark:text-zinc-400">Superávit de ~{form.goalCalories - tdee} kcal/día</span> respecto a tu TDEE ({tdee} kcal). Alta proteína ({form.goalProtein}g) y carbos para maximizar ganancias.</>}
            {form.goal === "maintain" && <>💡 <span className="text-gray-500 dark:text-zinc-400">TDEE estimado: {tdee} kcal</span> para {form.weight}kg / {form.height}cm con actividad moderada. Mantén este balance para estabilizar tu peso.</>}
          </p>
        </div>

        <Link
          href="/feedback"
          className="flex items-center justify-between bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 hover:border-gray-300 dark:hover:border-zinc-700 transition-colors"
        >
          <div>
            <p className="text-sm text-gray-900 dark:text-white font-medium">💬 Comunidad</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Ver opiniones y sugerencias del grupo</p>
          </div>
          <span className="text-gray-300 dark:text-zinc-600 text-lg">›</span>
        </Link>

        <a
          href="/api/export"
          className="flex items-center justify-center w-full py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
        >
          📥 Exportar datos (CSV)
        </a>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 h-auto rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 transition-colors text-sm"
        >
          {saveError ? "✗ Error al guardar" : saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
