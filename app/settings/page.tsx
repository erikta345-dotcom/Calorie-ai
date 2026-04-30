"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import BottomNav from "@/components/BottomNav";
import type { MealTimes } from "@/hooks/useSuggestedMeal";
import { subscribeAndSave } from "@/components/MealNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Settings = {
  weight: number;
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  mealTimes: MealTimes;
};

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
    goalCalories: 2800,
    goalProtein: 150,
    goalCarbs: 300,
    goalFat: 80,
    mealTimes: DEFAULT_MEAL_TIMES,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");

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
        setForm({ ...s, mealTimes: { ...DEFAULT_MEAL_TIMES, ...mealTimes } });
      });
  }, []);

  function handleWeightChange(w: number) {
    const weight = Math.max(1, w);
    setForm((f) => ({
      ...f,
      weight,
      goalCalories: Math.round(weight * 33),
      goalProtein: Math.round(weight * 2),
      goalCarbs: Math.round((weight * 33 * 0.45) / 4),
      goalFat: Math.round((weight * 33 * 0.25) / 9),
    }));
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

  const numField = (label: string, key: keyof Omit<Settings, "mealTimes">, unit: string) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-zinc-500">{unit}</p>
      </div>
      <input
        type="number"
        value={form[key] as number}
        onChange={(e) =>
          key === "weight"
            ? handleWeightChange(parseFloat(e.target.value) || 0)
            : setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })
        }
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
          {numField("Peso corporal", "weight", "kg · ajusta para recalcular objetivos")}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Objetivos diarios</p>
          {numField("Calorías", "goalCalories", "kcal/día")}
          {numField("Proteína", "goalProtein", "g/día · recomendado: peso × 2g")}
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
            💡 <span className="text-zinc-400">Para ganar músculo</span> necesitas un superávit calórico
            (~{Math.round(form.weight * 33)} kcal para {form.weight}kg) y suficiente proteína
            (~{Math.round(form.weight * 2)}g/día).
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40 transition-colors"
        >
          {saved ? "✅ Guardado" : saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
