"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import PageShell from "@/components/PageShell";
import { calcMacros } from "@/lib/macros";
import { useSuggestedMeal } from "@/hooks/useSuggestedMeal";
import ScanTabs from "@/components/scan/ScanTabs";
import ImagePicker from "@/components/scan/ImagePicker";
import ScanResultCard from "@/components/scan/ScanResultCard";
import BarcodeScannerView from "@/components/scan/BarcodeScannerView";
import { type Tab, type FoodItem, type ScanResult, type BarcodeProduct } from "@/components/scan/types";

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

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const barcodePhotoRef = useRef<HTMLInputElement>(null);
  const { meal: suggestedMeal, loaded: mealLoaded } = useSuggestedMeal();

  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [meal, setMeal] = useState(suggestedMeal);
  const [portion, setPortion] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [itemGramsStr, setItemGramsStr] = useState<Record<number, string>>({});

  const [barcodeActive, setBarcodeActive] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const [barcodeGramsStr, setBarcodeGramsStr] = useState("100");
  const [barcodeMeal, setBarcodeMeal] = useState(suggestedMeal);
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeSaving, setBarcodeSaving] = useState(false);
  const [barcodeSavingRecipe, setBarcodeSavingRecipe] = useState(false);
  const lastCodeRef = useRef("");
  const [activeTab, setActiveTab] = useState<Tab>("ai");
  const [manualCode, setManualCode] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const pendingCodeRef = useRef<{ code: string; count: number }>({ code: "", count: 0 });
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (mealLoaded) {
      setMeal(suggestedMeal);
      setBarcodeMeal(suggestedMeal);
    }
  }, [mealLoaded, suggestedMeal]);

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
          const m = calcMacros(item.caloriesPer100g, item.proteinPer100g, item.carbsPer100g, item.fatPer100g, item.grams * portion);
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
        body: JSON.stringify({ name: result.dish, calories: total.calories, protein: total.protein, carbs: total.carbs, fat: total.fat, grams: total.grams, meal, date: today, source: "scan", createdAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      router.push("/");
    } catch {
      setError("Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveToRecipe() {
    if (!result || !total || total.calories === 0) return;
    setSavingRecipe(true);
    try {
      const recipeItems = result.items
        .filter((i) => i.enabled)
        .map((item) => {
          const m = calcMacros(item.caloriesPer100g, item.proteinPer100g, item.carbsPer100g, item.fatPer100g, item.grams * portion);
          return { name: item.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat, grams: Math.round(item.grams * portion) };
        });
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: result.dish, items: recipeItems, totalCalories: total.calories, totalProtein: total.protein, totalCarbs: total.carbs, totalFat: total.fat }),
      });
      if (!res.ok) throw new Error();
      router.push("/recipes");
    } catch {
      setError("Error al guardar en recetas.");
    } finally {
      setSavingRecipe(false);
    }
  }

  const stopBarcode = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (zxingControlsRef.current) {
      try { zxingControlsRef.current.stop(); } catch {}
      zxingControlsRef.current = null;
    }
    setBarcodeActive(false);
    lastCodeRef.current = "";
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

    if ("BarcodeDetector" in window) {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setBarcodeError("DEBUG: navigator.mediaDevices no disponible");
          setBarcodeActive(false);
          return;
        }
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch (e1: any) {
          setBarcodeError(`DEBUG env fail: ${e1?.name} ${e1?.message} — intentando sin facingMode`);
          await new Promise(r => setTimeout(r, 2000));
          setBarcodeError("");
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch {}
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
              if (code && code !== lastCodeRef.current) {
                if (pendingCodeRef.current.code === code) {
                  pendingCodeRef.current.count++;
                } else {
                  pendingCodeRef.current = { code, count: 1 };
                }
                if (pendingCodeRef.current.count >= 8) {
                  pendingCodeRef.current = { code: "", count: 0 };
                  lastCodeRef.current = code;
                  stopBarcode();
                  setBarcodeActive(false);
                  await fetchBarcodeProduct(code);
                  return;
                }
              } else {
                pendingCodeRef.current = { code: "", count: 0 };
              }
            }
          } catch {}
          animFrameRef.current = requestAnimationFrame(scan);
        };
        animFrameRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        const name = err?.name ?? "";
        setBarcodeError(
          name === "NotAllowedError"
            ? "Sin permiso de cámara. Si usas la app instalada: Ajustes Android → Aplicaciones → [nombre app] → Permisos → Cámara → Permitir."
            : name === "NotFoundError"
            ? "No se encontró ninguna cámara en este dispositivo."
            : name === "NotReadableError"
            ? "La cámara está siendo usada por otra aplicación."
            : `No se pudo acceder a la cámara. (${name || err?.message || "error desconocido"})`
        );
        setBarcodeActive(false);
      }
    } else {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        let stopped = false;
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result, _err, ctrl) => {
            if (stopped || !result) return;
            const code = result.getText();
            if (!code) return;
            if (pendingCodeRef.current.code === code) {
              pendingCodeRef.current.count++;
            } else {
              pendingCodeRef.current = { code, count: 1 };
            }
            if (pendingCodeRef.current.count >= 3) {
              stopped = true;
              pendingCodeRef.current = { code: "", count: 0 };
              ctrl.stop();
              zxingControlsRef.current = null;
              setBarcodeActive(false);
              fetchBarcodeProduct(code);
            }
          }
        );
        zxingControlsRef.current = controls;
      } catch (err: any) {
        const name = err?.name ?? "";
        setBarcodeError(
          name === "NotAllowedError"
            ? "Sin permiso de cámara. Si usas la app instalada: Ajustes Android → Aplicaciones → [nombre app] → Permisos → Cámara → Permitir."
            : name === "NotFoundError"
            ? "No se encontró ninguna cámara en este dispositivo."
            : name === "NotReadableError"
            ? "La cámara está siendo usada por otra aplicación."
            : `No se pudo acceder a la cámara. (${name || err?.message || "error desconocido"})`
        );
        setBarcodeActive(false);
      }
    }
  }

  async function handleManualBarcode() {
    if (!manualCode.trim()) return;
    setBarcodeProduct(null);
    setBarcodeError("");
    await fetchBarcodeProduct(manualCode.trim());
    setManualCode("");
  }

  async function handleBarcodePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setBarcodeProduct(null);
    setBarcodeError("");
    setBarcodeLoading(true);
    try {
      let code: string | null = null;
      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        const bitmap = await createImageBitmap(file);
        const barcodes = await detector.detect(bitmap);
        if (barcodes.length > 0) code = barcodes[0].rawValue;
      }
      if (!code) {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const url = URL.createObjectURL(file);
        try {
          const result = await reader.decodeFromImageUrl(url);
          code = result.getText();
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      if (!code) throw new Error("No se detectó ningún código en la foto.");
      await fetchBarcodeProduct(code);
    } catch (err: any) {
      setBarcodeError(err?.message || "No se detectó ningún código en la foto.");
      setBarcodeLoading(false);
    }
  }

  const barcodeGrams = Math.max(1, parseFloat(barcodeGramsStr) || 1);

  const barcodeTotal = barcodeProduct
    ? calcMacros(barcodeProduct.calories, barcodeProduct.protein, barcodeProduct.carbs, barcodeProduct.fat, barcodeGrams)
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
          createdAt: new Date().toISOString(),
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

  async function handleBarcodeSaveToRecipe() {
    if (!barcodeProduct || !barcodeTotal) return;
    setBarcodeSavingRecipe(true);
    try {
      const name = barcodeProduct.brand ? `${barcodeProduct.name} (${barcodeProduct.brand})` : barcodeProduct.name;
      const recipeItems = [{ name, calories: barcodeTotal.calories, protein: barcodeTotal.protein, carbs: barcodeTotal.carbs, fat: barcodeTotal.fat, grams: barcodeGrams }];
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, items: recipeItems, totalCalories: barcodeTotal.calories, totalProtein: barcodeTotal.protein, totalCarbs: barcodeTotal.carbs, totalFat: barcodeTotal.fat }),
      });
      if (!res.ok) throw new Error();
      router.push("/recipes");
    } catch {
      setBarcodeError("Error al guardar en recetas.");
    } finally {
      setBarcodeSavingRecipe(false);
    }
  }

  function handleTabChange(tab: Tab) {
    if (barcodeActive) stopBarcode();
    setActiveTab(tab);
  }

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-5">
        <p className="text-gray-400 dark:text-zinc-500 text-xs uppercase tracking-widest font-medium">Registro</p>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-0.5">Escanear</h1>
      </header>

      <ScanTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === "ai" && (
        <>
          <ImagePicker
            fileRef={fileRef}
            cameraRef={cameraRef}
            preview={preview}
            description={description}
            loading={loading}
            loadStep={loadStep}
            hasResult={!!result}
            error={error}
            onFileChange={handleFileChange}
            onDescriptionChange={setDescription}
            onScan={handleScan}
          />

          {result && total && (
            <ScanResultCard
              result={result}
              total={total}
              portion={portion}
              meal={meal}
              saving={saving}
              savingRecipe={savingRecipe}
              itemGramsStr={itemGramsStr}
              onDishChange={(val) => setResult({ ...result, dish: val })}
              onToggleItem={toggleItem}
              onUpdateName={updateName}
              onItemGramsStrChange={setItemGramsStr}
              onUpdateGrams={updateGrams}
              onPortionChange={setPortion}
              onMealChange={setMeal}
              onSave={handleSave}
              onSaveToRecipe={handleSaveToRecipe}
            />
          )}
        </>
      )}

      {activeTab === "barcode" && (
        <>
          <input
            ref={barcodePhotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleBarcodePhotoChange}
          />
          <BarcodeScannerView
            videoRef={videoRef}
            barcodeActive={barcodeActive}
            barcodeLoading={barcodeLoading}
            barcodeProduct={barcodeProduct}
            barcodeTotal={barcodeTotal}
            barcodeGrams={barcodeGrams}
            barcodeGramsStr={barcodeGramsStr}
            barcodeMeal={barcodeMeal}
            barcodeError={barcodeError}
            barcodeSaving={barcodeSaving}
            barcodeSavingRecipe={barcodeSavingRecipe}
            manualCode={manualCode}
            onStartScanner={startBarcodeScanner}
            onStopScanner={stopBarcode}
            onTakePhoto={() => barcodePhotoRef.current?.click()}
            onManualCodeChange={setManualCode}
            onManualBarcode={handleManualBarcode}
            onBarcodeGramsStrChange={setBarcodeGramsStr}
            onBarcodeMealChange={setBarcodeMeal}
            onBarcodeSave={handleBarcodeSave}
            onBarcodeSaveToRecipe={handleBarcodeSaveToRecipe}
            onScanAnother={() => { setBarcodeProduct(null); setBarcodeError(""); startBarcodeScanner(); }}
          />
        </>
      )}

    </PageShell>
  );
}
