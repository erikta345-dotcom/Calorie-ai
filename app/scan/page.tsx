"use client";

import { useRef, useState, useMemo, useEffect } from "react";
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

async function compressImage(dataUrl: string, rotation: number, zoom: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1024;
      const sideways = Math.abs(rotation % 180) === 90;
      const rotatedWidth = sideways ? img.height : img.width;
      const rotatedHeight = sideways ? img.width : img.height;
      const baseScale = Math.min(MAX / rotatedWidth, MAX / rotatedHeight, 1);
      const ratio = baseScale * zoom;
      const w = Math.round(rotatedWidth * baseScale);
      const h = Math.round(rotatedHeight * baseScale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.translate(w / 2, h / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(ratio, ratio);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const QUICK_FOODS = [
  { name: "Pechuga de pollo", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Arroz blanco cocido", calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Huevo", calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { name: "Patata cocida", calories: 87, protein: 1.9, carbs: 20.1, fat: 0.1 },
  { name: "Aguacate", calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { name: "Aceite de oliva", calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Pan", calories: 265, protein: 9, carbs: 49, fat: 3.2 },
  { name: "Salmón", calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: "Plátano", calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
];

export default function ScanPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const barcodePhotoRef = useRef<HTMLInputElement>(null);
  const { meal: suggestedMeal, loaded: mealLoaded } = useSuggestedMeal();

  const [preview, setPreview] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
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
  const [quickFoodIndex, setQuickFoodIndex] = useState(0);

  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeProduct, setBarcodeProduct] = useState<BarcodeProduct | null>(null);
  const [barcodeGramsStr, setBarcodeGramsStr] = useState("100");
  const [barcodeMeal, setBarcodeMeal] = useState(suggestedMeal);
  const [barcodeError, setBarcodeError] = useState("");
  const [barcodeSaving, setBarcodeSaving] = useState(false);
  const [barcodeSavingRecipe, setBarcodeSavingRecipe] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("ai");
  const [manualCode, setManualCode] = useState("");
  const [activeBarcodeCode, setActiveBarcodeCode] = useState("");
  const [customProduct, setCustomProduct] = useState({ name: "", brand: "", calories: "", protein: "", carbs: "", fat: "", servingG: "100" });

  useEffect(() => {
    if (mealLoaded) {
      setMeal(suggestedMeal);
      setBarcodeMeal(suggestedMeal);
    }
  }, [mealLoaded, suggestedMeal]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); setRotation(0); setZoom(1); };
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
      const compressed = await compressImage(preview, rotation, zoom);
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
        confidence: item.confidence ?? "low",
        needsReview: item.needsReview ?? true,
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

  function removeItem(idx: number) {
    if (!result) return;
    setResult({ ...result, items: result.items.filter((_, i) => i !== idx) });
  }

  function addQuickFood(index: number) {
    if (!result || result.items.length >= 15) return;
    const food = QUICK_FOODS[index];
    setResult({ ...result, items: [...result.items, { name: food.name, grams: 100, caloriesPer100g: food.calories, proteinPer100g: food.protein, carbsPer100g: food.carbs, fatPer100g: food.fat, enabled: true, confidence: "high", needsReview: false }] });
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

  async function fetchBarcodeProduct(code: string) {
    setBarcodeLoading(true);
    setActiveBarcodeCode(code);
    setBarcodeProduct(null);
    setBarcodeError("");
    try {
      const saved = localStorage.getItem(`calorie-ai-barcode:${code}`);
      if (saved) {
        try {
          const product = JSON.parse(saved) as BarcodeProduct;
          setBarcodeProduct(product);
          setBarcodeGramsStr(String(product.servingG || 100));
          return;
        } catch {
          localStorage.removeItem(`calorie-ai-barcode:${code}`);
        }
      }
      const r = await fetch(`/api/barcode?code=${encodeURIComponent(code)}`);
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setBarcodeProduct(data);
      setCustomProduct({ name: "", brand: "", calories: "", protein: "", carbs: "", fat: "", servingG: "100" });
      if (data.servingG) setBarcodeGramsStr(String(data.servingG));
    } catch (e: any) {
      setBarcodeError(e.message || "Producto no encontrado");
    } finally {
      setBarcodeLoading(false);
    }
  }

  async function handleManualBarcode() {
    if (!manualCode.trim()) return;
    setBarcodeProduct(null);
    setBarcodeError("");
    await fetchBarcodeProduct(manualCode.trim());
    setManualCode("");
  }

  function handleSaveCustomProduct() {
    const name = customProduct.name.trim();
    const values = [customProduct.calories, customProduct.protein, customProduct.carbs, customProduct.fat].map(Number);
    const servingG = Number(customProduct.servingG);
    if (!name || values.some((value) => !Number.isFinite(value) || value < 0) || !Number.isFinite(servingG) || servingG <= 0) {
      setBarcodeError("Completa el nombre y valores nutricionales válidos.");
      return;
    }
    const product: BarcodeProduct = { name, brand: customProduct.brand.trim(), calories: values[0], protein: values[1], carbs: values[2], fat: values[3], servingG, code: activeBarcodeCode, custom: true };
    try {
      localStorage.setItem(`calorie-ai-barcode:${activeBarcodeCode}`, JSON.stringify(product));
    } catch {
      setBarcodeError("No se pudo guardar en este dispositivo. Libera espacio e inténtalo de nuevo.");
      return;
    }
    setBarcodeProduct(product);
    setBarcodeGramsStr(String(servingG));
    setBarcodeError("");
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
            rotation={rotation}
            zoom={zoom}
            description={description}
            loading={loading}
            loadStep={loadStep}
            hasResult={!!result}
            error={error}
            onFileChange={handleFileChange}
            onRotate={() => setRotation((r) => (r + 90) % 360)}
            onZoomChange={setZoom}
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
              onRemoveItem={removeItem}
              quickFoodIndex={quickFoodIndex}
              onQuickFoodIndexChange={setQuickFoodIndex}
              onAddQuickFood={() => addQuickFood(quickFoodIndex)}
              quickFoods={QUICK_FOODS.map((food) => food.name)}
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
            activeBarcodeCode={activeBarcodeCode}
            customProduct={customProduct}
            onCustomProductChange={(key, value) => setCustomProduct((p) => ({ ...p, [key]: value }))}
            onSaveCustomProduct={handleSaveCustomProduct}
            onTakePhoto={() => barcodePhotoRef.current?.click()}
            onManualCodeChange={setManualCode}
            onManualBarcode={handleManualBarcode}
            onBarcodeGramsStrChange={setBarcodeGramsStr}
            onBarcodeMealChange={setBarcodeMeal}
            onBarcodeSave={handleBarcodeSave}
            onBarcodeSaveToRecipe={handleBarcodeSaveToRecipe}
            onScanAnother={() => { setBarcodeProduct(null); setBarcodeError(""); setActiveBarcodeCode(""); }}
          />
        </>
      )}

    </PageShell>
  );
}
