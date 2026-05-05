"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";
import { useSuggestedMeal } from "@/hooks/useSuggestedMeal";
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, Sparkles, RotateCcw, Save } from "lucide-react";

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

type BarcodeProduct = {
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingG: number | null;
};

const MEALS = ["desayuno", "comida", "merienda", "cena", "snack"];
const LOAD_STEPS = ["Comprimiendo imagen...", "Identificando alimentos...", "Calculando macros..."];
const PORTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
const PORTION_LABELS = ["½×", "¾×", "1×", "1½×", "2×"];
type Tab = "ai" | "barcode";

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
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { meal: suggestedMeal, loaded: mealLoaded } = useSuggestedMeal();

  // AI scan state
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [meal, setMeal] = useState(suggestedMeal);
  const [portion, setPortion] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [itemGramsStr, setItemGramsStr] = useState<Record<number, string>>({});

  // Barcode state
  const [barcodeActive, setBarcodeActive] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const [barcodeGramsStr, setBarcodeGramsStr] = useState("100");
  const [barcodeMeal, setBarcodeMeal] = useState(suggestedMeal);
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeSaving, setBarcodeSaving] = useState(false);
  const [lastCode, setLastCode] = useState("");

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
        body: JSON.stringify({ image: compressed, description }),
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
      setItemGramsStr({});
    } catch (e: any) {
      const msg = e?.message || "";
      setError(msg.includes("ocupada") ? msg : "No pude identificar la comida. Intenta con otra foto más clara.");
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
    setResult({ ...result, items: result.items.map((it, i) => i === idx ? { ...it, grams: Math.max(1, val) } : it) });
  }

  function updateName(idx: number, val: string) {
    if (!result) return;
    setResult({ ...result, items: result.items.map((it, i) => i === idx ? { ...it, name: val } : it) });
  }

  function toggleItem(idx: number) {
    if (!result) return;
    setResult({ ...result, items: result.items.map((it, i) => i === idx ? { ...it, enabled: !it.enabled } : it) });
  }

  async function handleSave() {
    if (!result || !total || total.calories === 0) return;
    setSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: result.dish, calories: total.calories, protein: total.protein, carbs: total.carbs, fat: total.fat, grams: total.grams, meal, date: today, source: "scan" }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  const [activeTab, setActiveTab] = useState<Tab>("ai");

  useEffect(() => {
    if (mealLoaded) {
      setMeal(suggestedMeal);
      setBarcodeMeal(suggestedMeal);
    }
  }, [mealLoaded, suggestedMeal]);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [barcodeSupported, setBarcodeSupported] = useState<boolean | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    setBarcodeSupported("BarcodeDetector" in window);
  }, []);

  const stopBarcode = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setBarcodeActive(false);
    setLastCode("");
  }, []);

  async function fetchBarcodeProduct(code: string) {
    setBarcodeLoading(true);
    try {
      const r = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setBarcodeProduct(data);
      if (data.servingG) setBarcodeGramsStr(String(data.servingG));
    } catch (e: any) {
      setBarcodeError(e.message || "Producto no encontrado");
    } finally {
      setBarcodeLoading(false);
    }
  }

  async function startBarcodeScanner() {
    setBarcodeProduct(null);
    setBarcodeError("");
    setBarcodeActive(true);
    setBarcodeGramsStr("100");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new (window as any).BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
      });

      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            if (code && code !== lastCode) {
              setLastCode(code);
              stopBarcode();
              setBarcodeActive(false);
              await fetchBarcodeProduct(code);
              return;
            }
          }
        } catch {}
        animFrameRef.current = requestAnimationFrame(scan);
      }

      animFrameRef.current = requestAnimationFrame(scan);
    } catch {
      setBarcodeError("No se pudo acceder a la cámara.");
      setBarcodeActive(false);
    }
  }

  async function handleManualBarcode() {
    if (!manualCode.trim()) return;
    setBarcodeProduct(null);
    setBarcodeError("");
    await fetchBarcodeProduct(manualCode.trim());
    setManualCode("");
  }

  const barcodeGrams = Math.max(1, parseFloat(barcodeGramsStr) || 1);

  const barcodeTotal = barcodeProduct
    ? {
        calories: Math.round((barcodeProduct.calories * barcodeGrams) / 100),
        protein: Math.round((barcodeProduct.protein * barcodeGrams) / 100 * 10) / 10,
        carbs: Math.round((barcodeProduct.carbs * barcodeGrams) / 100 * 10) / 10,
        fat: Math.round((barcodeProduct.fat * barcodeGrams) / 100 * 10) / 10,
      }
    : null;

  async function handleBarcodeSave() {
    if (!barcodeProduct || !barcodeTotal) return;
    setBarcodeSaving(true);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: barcodeProduct.brand ? `${barcodeProduct.name} (${barcodeProduct.brand})` : barcodeProduct.name,
          calories: barcodeTotal.calories,
          protein: barcodeTotal.protein,
          carbs: barcodeTotal.carbs,
          fat: barcodeTotal.fat,
          grams: barcodeGrams,
          meal: barcodeMeal,
          date: today,
          source: "barcode",
        }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setBarcodeError("Error al guardar.");
    } finally {
      setBarcodeSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-5">
        <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">Registro</p>
        <h1 className="text-3xl font-bold text-white mt-0.5">Escanear</h1>
      </header>

      {/* ── TABS ── */}
      <div className="flex gap-1 bg-zinc-900/80 rounded-xl p-1 mb-4 border border-zinc-800/60">
        <button
          onClick={() => { if (barcodeActive) stopBarcode(); setActiveTab("ai"); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "ai" ? "bg-brand-500 text-zinc-950 shadow-sm" : "text-zinc-400 hover:text-white"}`}
        >
          IA Vision
        </button>
        <button
          onClick={() => { if (barcodeActive) stopBarcode(); setActiveTab("barcode"); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "barcode" ? "bg-brand-500 text-zinc-950 shadow-sm" : "text-zinc-400 hover:text-white"}`}
        >
          Código de barras
        </button>
      </div>

      {activeTab === "ai" && (
      <>{/* ── AI SCAN ── */}
      <div
        onClick={() => preview ? fileRef.current?.click() : undefined}
        className={`relative w-full aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-zinc-900/80 transition-all ${preview ? "cursor-pointer border-brand-500/60 hover:border-brand-500" : "border-zinc-800"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center space-y-3 p-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto">
              <Camera size={28} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-zinc-300 text-sm font-medium">Añade una foto</p>
              <p className="text-zinc-600 text-xs mt-1">La IA identificará los alimentos y calculará los macros</p>
            </div>
          </div>
        )}
      </div>

      {!preview && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:border-brand-500 hover:text-white hover:bg-transparent gap-2"
          >
            <Camera size={16} /> Cámara
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:border-brand-500 hover:text-white hover:bg-transparent gap-2"
          >
            <ImageIcon size={16} /> Galería
          </Button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe el plato (opcional): ej. tortilla española, ración de bar"
        className="w-full mt-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
      />

      {preview && (
        <Button
          onClick={handleScan}
          disabled={loading}
          className="w-full mt-4 h-auto py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 gap-2"
        >
          {loading
            ? <><span className="animate-spin inline-block text-base">◌</span> {LOAD_STEPS[loadStep]}</>
            : result ? <><RotateCcw size={16} /> Volver a analizar</> : <><Sparkles size={16} /> Analizar con IA</>}
        </Button>
      )}

      {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}

      {result && total && (
        <div className="mt-4 space-y-3">
          <input
            value={result.dish}
            onChange={(e) => setResult({ ...result, dish: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold focus:outline-none focus:border-brand-500"
          />

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            {result.items.map((item, idx) => {
              const m = macros(item, portion);
              return (
                <div key={idx} className={`p-3 border-b border-zinc-800 last:border-0 ${!item.enabled ? "opacity-40" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      onClick={() => toggleItem(idx)}
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center text-xs font-bold transition-colors ${item.enabled ? "bg-brand-500 border-brand-500 text-white" : "border-zinc-600"}`}
                    >
                      {item.enabled && "✓"}
                    </button>
                    <input value={item.name} onChange={(e) => updateName(idx, e.target.value)} className="flex-1 bg-transparent text-sm text-white focus:outline-none min-w-0" />
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={itemGramsStr[idx] ?? String(item.grams)}
                        onChange={(e) => {
                          if (e.target.value === "" || /^\d*$/.test(e.target.value))
                            setItemGramsStr(p => ({ ...p, [idx]: e.target.value }));
                        }}
                        onBlur={() => {
                          const val = Math.max(1, parseInt(itemGramsStr[idx] ?? String(item.grams)) || 1);
                          updateGrams(idx, val);
                          setItemGramsStr(p => ({ ...p, [idx]: String(val) }));
                        }}
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

          <div>
            <p className="text-xs text-zinc-500 mb-2">Tamaño de porción</p>
            <div className="flex gap-1.5">
              {PORTIONS.map((p, i) => (
                <button key={p} onClick={() => setPortion(p)} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${portion === p ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                  {PORTION_LABELS[i]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-3">Total{portion !== 1 ? ` · porción ×${portion}` : ""} · {total.grams}g</p>
            <div className="grid grid-cols-5 gap-1">
              {[{ label: "kcal", value: total.calories, color: "text-white" }, { label: "Prot", value: total.protein, color: "text-orange-400" }, { label: "Carb", value: total.carbs, color: "text-blue-400" }, { label: "Gras", value: total.fat, color: "text-yellow-400" }].map((m) => (
                <div key={m.label} className="bg-zinc-800 rounded-lg p-2 text-center">
                  <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                  <p className="text-xs text-zinc-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">¿En qué comida?</label>
            <div className="grid grid-cols-5 gap-1">
              {MEALS.map((m) => (
                <button key={m} onClick={() => setMeal(m)} className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${meal === m ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"}`}>{m}</button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || total.calories === 0} className="w-full h-auto py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 gap-2">
            <Save size={16} />{saving ? "Guardando..." : `Añadir ${total.calories} kcal al diario`}
          </Button>
        </div>
      )}

      </>)}

      {activeTab === "barcode" && (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔢</span>
          <div>
            <p className="text-white text-sm font-semibold">Código de barras</p>
            <p className="text-zinc-500 text-xs">Datos exactos del fabricante</p>
          </div>
        </div>

        {!barcodeActive && !barcodeProduct && !barcodeLoading && (
          <div className="space-y-2">
            {barcodeSupported !== false && (
              <button
                onClick={startBarcodeScanner}
                className="w-full py-3 rounded-xl border border-zinc-700 text-zinc-300 font-semibold hover:border-brand-500 hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                📷 Escanear código de barras
              </button>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualBarcode()}
                placeholder="Introducir código manualmente"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500"
              />
              <button
                onClick={handleManualBarcode}
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-zinc-700 transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>
        )}

        {barcodeActive && (
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-700">
            <video ref={videoRef} className="w-full aspect-square object-cover" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-brand-500 rounded-xl relative">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-500 opacity-70 animate-pulse" />
              </div>
              <p className="text-white text-xs mt-3 bg-black/50 px-3 py-1 rounded-full">Apunta al código de barras</p>
            </div>
            <button onClick={stopBarcode} className="absolute top-3 right-3 bg-zinc-900/80 text-zinc-300 text-xs px-3 py-1.5 rounded-full">
              Cancelar
            </button>
          </div>
        )}

        {barcodeLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-zinc-400 text-sm">
            <span className="animate-spin inline-block">⚙️</span> Buscando producto...
          </div>
        )}

        {barcodeError && (
          <div className="space-y-2">
            <p className="text-red-400 text-sm text-center">{barcodeError}</p>
            <button onClick={startBarcodeScanner} className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:border-brand-500 transition-colors">
              Intentar de nuevo
            </button>
          </div>
        )}

        {barcodeProduct && barcodeTotal && (
          <div className="space-y-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1">
              <p className="text-white font-semibold text-sm">{barcodeProduct.name}</p>
              {barcodeProduct.brand && <p className="text-zinc-500 text-xs">{barcodeProduct.brand}</p>}
              <p className="text-zinc-600 text-xs">Por 100g: {barcodeProduct.calories} kcal · P {barcodeProduct.protein}g · C {barcodeProduct.carbs}g · G {barcodeProduct.fat}g</p>
            </div>

            <div>
              <label className="text-xs text-zinc-500 block mb-2">Cantidad (gramos)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  value={barcodeGramsStr}
                  onChange={(e) => {
                    if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) setBarcodeGramsStr(e.target.value);
                  }}
                  onBlur={() => setBarcodeGramsStr(String(Math.max(1, parseFloat(barcodeGramsStr) || 1)))}
                  className="flex-1 bg-zinc-900 border border-zinc-700 text-white text-center text-xl font-bold rounded-xl py-3 focus:outline-none focus:border-brand-500"
                />
                <div className="flex flex-col gap-1">
                  {barcodeProduct.servingG && (
                    <button onClick={() => setBarcodeGramsStr(String(Math.round(barcodeProduct.servingG!)))} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg hover:text-white transition-colors whitespace-nowrap">
                      1 ración ({barcodeProduct.servingG}g)
                    </button>
                  )}
                  <button onClick={() => setBarcodeGramsStr("100")} className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg hover:text-white transition-colors">
                    100g
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3">Total · {barcodeGrams}g</p>
              <div className="grid grid-cols-5 gap-1">
                {[{ label: "kcal", value: barcodeTotal.calories, color: "text-white" }, { label: "Prot", value: barcodeTotal.protein, color: "text-orange-400" }, { label: "Carb", value: barcodeTotal.carbs, color: "text-blue-400" }, { label: "Gras", value: barcodeTotal.fat, color: "text-yellow-400" }].map((m) => (
                  <div key={m.label} className="bg-zinc-800 rounded-lg p-2 text-center">
                    <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                    <p className="text-xs text-zinc-500">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 block mb-2">¿En qué comida?</label>
              <div className="grid grid-cols-5 gap-1">
                {MEALS.map((m) => (
                  <button key={m} onClick={() => setBarcodeMeal(m)} className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${barcodeMeal === m ? "bg-brand-500 text-white" : "bg-zinc-800 text-zinc-400"}`}>{m}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setBarcodeProduct(null); setBarcodeError(""); startBarcodeScanner(); }} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:border-brand-500 transition-colors">
                🔄 Otro producto
              </button>
              <button onClick={handleBarcodeSave} disabled={barcodeSaving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40">
                {barcodeSaving ? "Guardando..." : `💾 Añadir ${barcodeTotal.calories} kcal`}
              </button>
            </div>
          </div>
        )}
      </div>)}

      <BottomNav />
    </div>
  );
}
