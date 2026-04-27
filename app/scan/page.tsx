"use client";

import { useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

type FoodItem = {
  name: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  enabled: boolean;
};

type ScanResult = {
  dish: string;
  items: FoodItem[];
};

const MEALS = ["desayuno", "almuerzo", "cena", "snack"];
const LOAD_STEPS = ["Comprimiendo imagen...", "Identificando alimentos...", "Calculando macros..."];
const PORTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
const PORTION_LABELS = ["½×", "¾×", "1×", "1½×", "2×"];

async function compressImage(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

function macros(item: FoodItem, portionMult: number) {
  const f = (item.grams * portionMult) / 100;
  return {
    calories: Math.round(item.caloriesPer100g * f),
    protein: Math.round(item.proteinPer100g * f * 10) / 10,
    carbs: Math.round(item.carbsPer100g * f * 10) / 10,
    fat: Math.round(item.fatPer100g * f * 10) / 10,
  };
}

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [meal, setMeal] = useState("almuerzo");
  const [portion, setPortion] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
    setError("");
    setPortion(1);
  }

  async function handleScan() {
    if (!preview) return;
    setLoading(true);
    setLoadStep(0);
    setError("");
    try {
      const compressed = await compressImage(preview);
      setLoadStep(1);
      const res = await fetch("/api/ai-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: compressed }),
      });
      setLoadStep(2);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const items: FoodItem[] = data.items.map((item: any) => ({
        name: item.name,
        grams: item.grams,
        caloriesPer100g: (item.calories / item.grams) * 100,
        proteinPer100g: (item.protein / item.grams) * 100,
        carbsPer100g: (item.carbs / item.grams) * 100,
        fatPer100g: (item.fat / item.grams) * 100,
        enabled: true,
      }));

      setResult({ dish: data.dish, items });
      setPortion(1);
    } catch {
      setError("No pude identificar la comida. Intenta con otra foto más clara.");
    } finally {
      setLoading(false);
    }
  }

  const total = useMemo(() => {
    if (!result) return null;
    return result.items
      .filter((i) => i.enabled)
      .reduce(
        (acc, item) => {
          const m = macros(item, portion);
          return {
            calories: acc.calories + m.calories,
            protein: Math.round((acc.protein + m.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + m.carbs) * 10) / 10,
            fat: Math.round((acc.fat + m.fat) * 10) / 10,
            grams: acc.grams + Math.round(item.grams * portion),
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
      );
  }, [result, portion]);

  function updateGrams(idx: number, val: number) {
    if (!result) return;
    setResult({
      ...result,
      items: result.items.map((it, i) => i === idx ? { ...it, grams: Math.max(1, val) } : it),
    });
  }

  function updateName(idx: number, val: string) {
    if (!result) return;
    setResult({
      ...result,
      items: result.items.map((it, i) => i === idx ? { ...it, name: val } : it),
    });
  }

  function toggleItem(idx: number) {
    if (!result) return;
    setResult({
      ...result,
      items: result.items.map((it, i) => i === idx ? { ...it, enabled: !it.enabled } : it),
    });
  }

  async function handleSave() {
    if (!result || !total || total.calories === 0) return;
    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: result.dish,
          calories: total.calories,
          protein: total.protein,
          carbs: total.carbs,
          fat: total.fat,
          grams: total.grams,
          meal,
          date: today,
          source: "scan",
        }),
      });
      if (!res.ok) throw new Error();
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
        <p className="text-zinc-500 text-sm mt-1">IA detecta cada componente del plato</p>
      </header>

      {/* Photo zone */}
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

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      {preview && (
        <button
          onClick={handleScan}
          disabled={loading}
          className="w-full mt-4 py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading
            ? <><span className="animate-spin inline-block">⚙️</span> {LOAD_STEPS[loadStep]}</>
            : <>{result ? "🔄 Volver a analizar" : "✨ Analizar con IA"}</>
          }
        </button>
      )}

      {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}

      {result && total && (
        <div className="mt-4 space-y-3">
          {/* Dish name */}
          <input
            value={result.dish}
            onChange={(e) => setResult({ ...result, dish: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-brand-500"
          />

          {/* Items breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {result.items.map((item, idx) => {
              const m = macros(item, portion);
              return (
                <div key={idx} className={`p-3 border-b border-zinc-800 last:border-0 ${!item.enabled ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      onClick={() => toggleItem(idx)}
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                        item.enabled ? "bg-brand-500 border-brand-500 text-white" : "border-zinc-600"
                      }`}
                    >
                      {item.enabled && "✓"}
                    </button>
                    <input
                      value={item.name}
                      onChange={(e) => updateName(idx, e.target.value)}
                      className="flex-1 bg-transparent text-sm text-white focus:outline-none min-w-0"
                    />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        value={item.grams}
                        onChange={(e) => updateGrams(idx, parseInt(e.target.value) || 1)}
                        className="w-14 bg-zinc-800 text-white text-xs text-right rounded-lg px-2 py-1 focus:outline-none"
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

          {/* Portion multiplier */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Tamaño de porción</p>
            <div className="flex gap-1.5">
              {PORTIONS.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setPortion(p)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    portion === p ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {PORTION_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-3">
              Total{portion !== 1 ? ` · porción ×${portion}` : ""} · {total.grams}g
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "kcal", value: total.calories, color: "text-white" },
                { label: "Prot", value: total.protein, color: "text-orange-400" },
                { label: "Carb", value: total.carbs, color: "text-blue-400" },
                { label: "Gras", value: total.fat, color: "text-yellow-400" },
              ].map((m) => (
                <div key={m.label} className="bg-zinc-800 rounded-lg p-2 text-center">
                  <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Meal selector */}
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

          <button
            onClick={handleSave}
            disabled={saving || total.calories === 0}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40"
          >
            {saving ? "Guardando..." : `💾 Añadir ${total.calories} kcal al diario`}
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
