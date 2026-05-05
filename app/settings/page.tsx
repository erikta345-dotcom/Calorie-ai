"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";
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
    height: 175,
    age: 25,
    gender: "male",
    goal: "maintain",
    goalCalories: 2635,
    goalProtein: 135,
    goalCarbs: 297,
    goalFat: 73,
    mealTimes: DEFAULT_MEAL_TIMES,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbacks, setFeedbacks] = useState<{ id: string; author: string; message: string; createdAt: string }[]>([]);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    fetch("/api/feedback")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFeedbacks(data); });
  }, []);

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: feedbackText.trim() }),
    });
    if (res.ok) {
      setFeedbackText("");
      const updated = await fetch("/api/feedback").then((r) => r.json());
      if (Array.isArray(updated)) setFeedbacks(updated);
    }
    setSubmittingFeedback(false);
  }

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (!s) return;
        const mealTimes = s.mealTimes
          ? (typeof s.mealTimes === "string" ? JSON.parse(s.mealTimes) : s.mealTimes)
          : DEFAULT_MEAL_TIMES;
        setForm({ ...s, height: s.height ?? 175, age: s.age ?? 25, gender: s.gender ?? "male", goal: s.goal ?? "maintain", mealTimes: { ...DEFAULT_MEAL_TIMES, ...mealTimes } });
      });
  }, []);

  function handleBodyChange(patch: Partial<Pick<Settings, "weight" | "height" | "age" | "gender" | "goal">>) {
    setForm((f) => {
      const next = { ...f, ...patch };
      return { ...next, ...calcMacros(next.weight, next.height, next.age, next.gender, next.goal) };
    });
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    window.dispatchEvent(new CustomEvent("meal-times-updated"));
  }

  const bmi = form.height > 0 ? form.weight / Math.pow(form.height / 100, 2) : null;
  const bmiLabel = bmi ? (bmi < 18.5 ? "Bajo peso" : bmi < 25 ? "Normal" : bmi < 30 ? "Sobrepeso" : "Obesidad") : null;
  const sexOffset = form.gender === "male" ? 5 : -161;
  const tdee = Math.round((10 * form.weight + 6.25 * Math.max(form.height, 100) - 5 * Math.max(form.age, 1) + sexOffset) * 1.55);

  const numField = (label: string, key: keyof Omit<Settings, "mealTimes" | "goal" | "gender">, unit: string) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-zinc-500">{unit}</p>
      </div>
      <input
        type="number"
        value={form[key] as number}
        onChange={(e) => {
          const val = parseFloat(e.target.value) || 0;
          if (key === "weight") handleBodyChange({ weight: Math.max(1, val) });
          else if (key === "height") handleBodyChange({ height: Math.max(50, val) });
          else if (key === "age") handleBodyChange({ age: Math.max(1, val) });
          else setForm({ ...form, [key]: val });
        }}
        className="w-24 bg-zinc-800 text-white text-right rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">⚙️ Configuración</h1>
          <p className="text-zinc-500 text-sm mt-1">Ajusta tus objetivos y horarios</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full ring-2 ring-zinc-700 hover:ring-brand-500 transition-all focus:outline-none">
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
                <AvatarFallback className="bg-zinc-800 text-white text-sm">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-white">
            <DropdownMenuLabel className="text-zinc-400 font-normal text-xs">
              <p className="font-semibold text-white truncate">{session?.user?.name}</p>
              <p className="truncate text-zinc-500">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-800" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-red-400 focus:text-red-400 focus:bg-zinc-800 cursor-pointer"
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Tu cuerpo</p>
          {numField("Peso corporal", "weight", "kg")}
          {numField("Altura", "height", "cm")}
          {numField("Edad", "age", "años")}
          <div className="flex items-center justify-between py-3 border-b border-zinc-800">
            <p className="text-sm text-white">Sexo</p>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => handleBodyChange({ gender: g })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    form.gender === g ? "bg-brand-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {g === "male" ? "Hombre" : "Mujer"}
                </button>
              ))}
            </div>
          </div>
          {bmi && (
            <div className="flex items-center justify-between py-3 border-t border-zinc-800">
              <p className="text-sm text-zinc-400">IMC</p>
              <div className="text-right">
                <span className="text-sm text-white font-medium">{bmi.toFixed(1)}</span>
                <span className={`ml-2 text-xs ${bmi < 18.5 || bmi >= 30 ? "text-yellow-400" : "text-green-400"}`}>{bmiLabel}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 pt-3 pb-4">
          <p className="text-xs text-zinc-500 pb-3 font-semibold uppercase tracking-wide">Objetivo</p>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => handleBodyChange({ goal: plan.id })}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-colors ${
                  form.goal === plan.id
                    ? "border-brand-500 bg-brand-500/10 text-white"
                    : "border-zinc-800 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span className="text-xl">{plan.emoji}</span>
                <span className="text-xs font-medium">{plan.label}</span>
                <span className="text-[10px] text-zinc-600">{plan.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Macros diarios</p>
          {numField("Calorías", "goalCalories", "kcal/día")}
          {numField("Proteína", "goalProtein", "g/día")}
          {numField("Carbohidratos", "goalCarbs", "g/día")}
          {numField("Grasa", "goalFat", "g/día")}
        </div>

        {/* Meal times */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <div className="flex items-center justify-between pt-3 pb-1">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wide">Horario de comidas</p>
            {notifPerm !== "granted" ? (
              <button
                onClick={async () => {
                  if (!("Notification" in window)) return;
                  const perm = await Notification.requestPermission();
                  setNotifPerm(perm);
                  if (perm === "granted") {
                    await subscribeAndSave();
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
          <p className="text-xs text-zinc-600 pb-2">Notificación cuando llegue la hora</p>
          {(Object.keys(MEAL_LABELS) as (keyof MealTimes)[]).map((meal) => (
            <div key={meal} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
              <p className="text-sm text-white">{MEAL_LABELS[meal]}</p>
              <input
                type="time"
                value={form.mealTimes[meal]}
                onChange={(e) =>
                  setForm({ ...form, mealTimes: { ...form.mealTimes, [meal]: e.target.value } })
                }
                className="bg-zinc-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ))}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 leading-relaxed">
            {form.goal === "lose_fat" && <>💡 <span className="text-zinc-400">Déficit de ~{tdee - form.goalCalories} kcal/día</span> respecto a tu TDEE ({tdee} kcal). Alta proteína ({form.goalProtein}g) para preservar músculo.</>}
            {form.goal === "gain_muscle" && <>💡 <span className="text-zinc-400">Superávit de ~{form.goalCalories - tdee} kcal/día</span> respecto a tu TDEE ({tdee} kcal). Alta proteína ({form.goalProtein}g) y carbos para maximizar ganancias.</>}
            {form.goal === "maintain" && <>💡 <span className="text-zinc-400">TDEE estimado: {tdee} kcal</span> para {form.weight}kg / {form.height}cm con actividad moderada. Mantén este balance para estabilizar tu peso.</>}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <p className="text-xs text-zinc-500 pt-1 pb-3 font-semibold uppercase tracking-wide">💬 Feedback de la comunidad</p>
          <div className="flex gap-2 pb-3">
            <input
              type="text"
              placeholder="Tu opinión o sugerencia..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFeedbackSubmit()}
              className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-zinc-600"
            />
            <button
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim() || submittingFeedback}
              className="px-4 py-2 bg-brand-500 text-zinc-950 rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
            >
              {submittingFeedback ? "..." : "Enviar"}
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pb-1">
            {feedbacks.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center py-3">Sé el primero en dejar feedback</p>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} className="bg-zinc-800 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-brand-400">{fb.author}</span>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(fb.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300">{fb.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 h-auto rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 transition-colors text-sm"
        >
          {saved ? "✓ Guardado" : saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}
