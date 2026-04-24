"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type ParsedFood = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
};

const MEALS = ["desayuno", "almuerzo", "cena", "snack"];

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFood | null>(null);
  const [meal, setMeal] = useState("almuerzo");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setParsed(null);
    setError("");
  }

  async function handleScan() {
    if (!preview) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsed(data);
    } catch {
      setError("No pude identificar la comida. Intenta con otra foto más clara.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!parsed) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, meal, date: today, source: "scan" }),
      });
      router.push("/");
    } catch {
      setError("Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">📸 Escanear comida</h1>
        <p className="text-zinc-500 text-sm mt-1">Haz una foto y la IA estimará las calorías</p>
      </header>

      {/* Zona de foto */}
      <div
        onClick={() => fileRef.current?.click()}
        className="relative w-full aspect-square rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center cursor-pointer overflow-hidden bg-zinc-900 hover:border-brand-500 transition-colors"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center space-y-2">
            <p className="text-5xl">🍽️</p>
            <p className="text-zinc-400 text-sm">Toca para abrir la cámara</p>
            <p className="text-zinc-600 text-xs">o selecciona una foto</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview && !parsed && (
        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><span className="animate-spin inline-block">⚙️</span> Analizando...</>
          ) : (
            <>✨ Analizar con IA</>
          )}
        </button>
      )}

      {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}

      {/* Resultado */}
      {parsed && (
        <div className="mt-4 space-y-4">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
            <h2 className="font-semibold text-white">Resultado</h2>

            <div>
              <label className="text-xs text-zinc-500">Nombre</label>
              <input
                value={parsed.name}
                onChange={(e) => setParsed({ ...parsed, name: e.target.value })}
                className="w-full bg-transparent text-white text-sm py-1 border-b border-zinc-700 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["calories", "protein", "carbs", "fat", "grams"] as const).map((key) => (
                <div key={key}>
                  <label className="text-xs text-zinc-500 capitalize">
                    {key === "calories" ? "Calorías (kcal)" : key === "grams" ? "Gramos" : key}
                  </label>
                  <input
                    type="number"
                    value={parsed[key]}
                    onChange={(e) => setParsed({ ...parsed, [key]: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-white text-sm py-1 border-b border-zinc-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              ))}
            </div>

            {/* Macros visual */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { label: "Proteína", value: parsed.protein, color: "text-orange-400" },
                { label: "Carbos", value: parsed.carbs, color: "text-blue-400" },
                { label: "Grasa", value: parsed.fat, color: "text-yellow-400" },
              ].map((m) => (
                <div key={m.label} className="bg-zinc-800 rounded-lg p-2 text-center">
                  <p className={`text-lg font-bold ${m.color}`}>{Math.round(m.value)}g</p>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selector de comida */}
          <div>
            <label className="text-xs text-zinc-500 block mb-2">¿En qué comida?</label>
            <div className="grid grid-cols-4 gap-2">
              {MEALS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    meal === m
                      ? "bg-brand-500 text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

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
