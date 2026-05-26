"use client";

import { type RefObject } from "react";
import { type BarcodeProduct, type MacroTotal } from "./types";

const MEALS = ["desayuno", "snack", "comida", "merienda", "cena", "picoteo"];

interface BarcodeScannerViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  barcodeActive: boolean;
  barcodeLoading: boolean;
  barcodeProduct: BarcodeProduct | null;
  barcodeTotal: MacroTotal | null;
  barcodeGrams: number;
  barcodeGramsStr: string;
  barcodeMeal: string;
  barcodeError: string;
  barcodeSaving: boolean;
  barcodeSavingRecipe: boolean;
  manualCode: string;
  onStartScanner: () => void;
  onStopScanner: () => void;
  onManualCodeChange: (val: string) => void;
  onManualBarcode: () => void;
  onBarcodeGramsStrChange: (val: string) => void;
  onBarcodeMealChange: (m: string) => void;
  onBarcodeSave: () => void;
  onBarcodeSaveToRecipe: () => void;
  onScanAnother: () => void;
}

export default function BarcodeScannerView({
  videoRef,
  barcodeActive,
  barcodeLoading,
  barcodeProduct,
  barcodeTotal,
  barcodeGrams,
  barcodeGramsStr,
  barcodeMeal,
  barcodeError,
  barcodeSaving,
  barcodeSavingRecipe,
  manualCode,
  onStartScanner,
  onStopScanner,
  onManualCodeChange,
  onManualBarcode,
  onBarcodeGramsStrChange,
  onBarcodeMealChange,
  onBarcodeSave,
  onBarcodeSaveToRecipe,
  onScanAnother,
}: BarcodeScannerViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔢</span>
        <div>
          <p className="text-gray-900 dark:text-white text-sm font-semibold">Código de barras</p>
          <p className="text-gray-400 dark:text-zinc-500 text-xs">Datos exactos del fabricante</p>
        </div>
      </div>

      {!barcodeActive && !barcodeProduct && !barcodeLoading && (
        <div className="space-y-2">
          <button
            onClick={onStartScanner}
            className="w-full py-3 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 font-semibold hover:border-brand-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            📷 Escanear código de barras
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => onManualCodeChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onManualBarcode()}
              placeholder="Introducir código manualmente"
              className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={onManualBarcode}
              disabled={!manualCode.trim()}
              className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Buscar
            </button>
          </div>
        </div>
      )}

      <div className={`relative rounded-2xl overflow-hidden bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700${barcodeActive ? "" : " hidden"}`}>
        <video ref={videoRef} className="w-full aspect-square object-cover" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-brand-500 rounded-xl relative">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-brand-500 opacity-70 animate-pulse" />
          </div>
          <p className="text-white text-xs mt-3 bg-black/50 px-3 py-1 rounded-full">Apunta al código de barras</p>
        </div>
        <button onClick={onStopScanner} className="absolute top-3 right-3 bg-gray-900/80 text-zinc-300 text-xs px-3 py-1.5 rounded-full">
          Cancelar
        </button>
      </div>

      {barcodeLoading && (
        <div className="flex items-center justify-center gap-2 py-6 text-gray-400 dark:text-zinc-400 text-sm">
          <span className="animate-spin inline-block">⚙️</span> Buscando producto...
        </div>
      )}

      {barcodeError && (
        <div className="space-y-2">
          <p className="text-red-400 text-sm text-center">{barcodeError}</p>
          <button onClick={onStartScanner} className="w-full py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-zinc-400 text-sm hover:border-brand-500 transition-colors">
            Intentar de nuevo
          </button>
        </div>
      )}

      {barcodeProduct && barcodeTotal && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 space-y-1">
            <p className="text-gray-900 dark:text-white font-semibold text-sm">{barcodeProduct.name}</p>
            {barcodeProduct.brand && <p className="text-gray-400 dark:text-zinc-500 text-xs">{barcodeProduct.brand}</p>}
            <p className="text-gray-300 dark:text-zinc-600 text-xs">Por 100g: {barcodeProduct.calories} kcal · P {barcodeProduct.protein}g · C {barcodeProduct.carbs}g · G {barcodeProduct.fat}g</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">Cantidad (gramos)</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={barcodeGramsStr}
                onChange={(e) => {
                  if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) onBarcodeGramsStrChange(e.target.value);
                }}
                onBlur={() => onBarcodeGramsStrChange(String(Math.max(1, parseFloat(barcodeGramsStr) || 1)))}
                className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-center text-xl font-bold rounded-xl py-3 focus:outline-none focus:border-brand-500"
              />
              <div className="flex flex-col gap-1">
                {barcodeProduct.servingG && (
                  <button onClick={() => onBarcodeGramsStrChange(String(Math.round(barcodeProduct.servingG!)))} className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap">
                    1 ración ({barcodeProduct.servingG}g)
                  </button>
                )}
                <button onClick={() => onBarcodeGramsStrChange("100")} className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-lg hover:text-gray-900 dark:hover:text-white transition-colors">
                  100g
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3">Total · {barcodeGrams}g</p>
            <div className="grid grid-cols-5 gap-1">
              {[{ label: "kcal", value: barcodeTotal.calories, color: "text-gray-900 dark:text-white" }, { label: "Prot", value: barcodeTotal.protein, color: "text-orange-400" }, { label: "Carb", value: barcodeTotal.carbs, color: "text-blue-400" }, { label: "Gras", value: barcodeTotal.fat, color: "text-yellow-400" }].map((m) => (
                <div key={m.label} className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-2 text-center">
                  <p className={`text-base font-bold ${m.color}`}>{Math.round(m.value)}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 dark:text-zinc-500 block mb-2">¿En qué comida?</label>
            <div className="grid grid-cols-5 gap-1">
              {MEALS.map((m) => (
                <button key={m} onClick={() => onBarcodeMealChange(m)} className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${barcodeMeal === m ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>{m}</button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onScanAnother} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-zinc-400 text-sm font-medium hover:border-brand-500 transition-colors">
              🔄 Otro producto
            </button>
            <button onClick={onBarcodeSave} disabled={barcodeSaving} className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-40">
              {barcodeSaving ? "Guardando..." : `💾 Añadir ${barcodeTotal.calories} kcal`}
            </button>
          </div>
          <button onClick={onBarcodeSaveToRecipe} disabled={barcodeSavingRecipe} className="w-full py-3 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-600 dark:text-zinc-300 text-sm font-semibold hover:border-brand-500 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            📖 {barcodeSavingRecipe ? "Guardando..." : "Guardar en recetas"}
          </button>
        </div>
      )}
    </div>
  );
}
