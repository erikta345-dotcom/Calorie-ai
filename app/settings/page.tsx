"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type Settings = {
  weight: number;
  goalCalories: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<Settings>({
    weight: 75,
    goalCalories: 2800,
    goalProtein: 150,
    goalCarbs: 300,
    goalFat: 80,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => { if (s) setForm(s); });
  }, []);

  // Auto-calcular objetivos al cambiar el peso
  function handleWeightChange(w: number) {
    setForm({
      weight: w,
      goalCalories: Math.round(w * 33),     // superávit para ganar músculo
      goalProtein: Math.round(w * 2),        // 2g/kg
      goalCarbs: Math.round((w * 33 * 0.45) / 4),  // 45% carbos
      goalFat: Math.round((w * 33 * 0.25) / 9),    // 25% grasas
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
  }

  const field = (label: string, key: keyof Settings, unit: string) => (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="text-xs text-zinc-500">{unit}</p>
      </div>
      <input
        type="number"
        value={form[key]}
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
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">⚙️ Configuración</h1>
        <p className="text-zinc-500 text-sm mt-1">Ajusta tus objetivos diarios</p>
      </header>

      <div className="space-y-4">
        {/* Peso */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Tu cuerpo</p>
          {field("Peso corporal", "weight", "kg · ajusta para recalcular objetivos")}
        </div>

        {/* Objetivos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          <p className="text-xs text-zinc-500 pt-3 pb-1 font-semibold uppercase tracking-wide">Objetivos diarios</p>
          {field("Calorías", "goalCalories", "kcal/día")}
          {field("Proteína", "goalProtein", "g/día · recomendado: peso × 2g")}
          {field("Carbohidratos", "goalCarbs", "g/día")}
          {field("Grasa", "goalFat", "g/día")}
        </div>

        {/* Info */}
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
          {saved ? "✅ Guardado" : saving ? "Guardando..." : "Guardar objetivos"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
