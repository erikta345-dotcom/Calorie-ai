"use client";

import { type RefObject } from "react";
import { Camera, ImageIcon, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOAD_STEPS = ["Comprimiendo imagen...", "Identificando alimentos...", "Calculando macros..."];

interface ImagePickerProps {
  fileRef: RefObject<HTMLInputElement>;
  cameraRef: RefObject<HTMLInputElement>;
  preview: string | null;
  description: string;
  loading: boolean;
  loadStep: number;
  hasResult: boolean;
  error: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDescriptionChange: (val: string) => void;
  onScan: () => void;
}

export default function ImagePicker({
  fileRef,
  cameraRef,
  preview,
  description,
  loading,
  loadStep,
  hasResult,
  error,
  onFileChange,
  onDescriptionChange,
  onScan,
}: ImagePickerProps) {
  return (
    <>
      <div
        onClick={() => (preview ? fileRef.current?.click() : undefined)}
        className={`relative w-full aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-gray-50/80 dark:bg-zinc-900/80 transition-all ${preview ? "cursor-pointer border-brand-500/60 hover:border-brand-500" : "border-gray-200 dark:border-zinc-800"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center space-y-3 p-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto">
              <Camera size={28} className="text-gray-400 dark:text-zinc-500" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-zinc-300 text-sm font-medium">Añade una foto</p>
              <p className="text-gray-300 dark:text-zinc-600 text-xs mt-1">La IA identificará los alimentos y calculará los macros</p>
            </div>
          </div>
        )}
      </div>

      {!preview && (
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            onClick={() => cameraRef.current?.click()}
            className="flex-1 border-gray-300 dark:border-zinc-700 bg-transparent text-gray-600 dark:text-zinc-300 hover:border-brand-500 hover:text-gray-900 dark:hover:text-white hover:bg-transparent gap-2"
          >
            <Camera size={16} /> Cámara
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="flex-1 border-gray-300 dark:border-zinc-700 bg-transparent text-gray-600 dark:text-zinc-300 hover:border-brand-500 hover:text-gray-900 dark:hover:text-white hover:bg-transparent gap-2"
          >
            <ImageIcon size={16} /> Galería
          </Button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />

      <input
        type="text"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="Describe el plato (opcional): ej. tortilla española, ración de bar"
        className="w-full mt-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-brand-500"
      />

      {preview && (
        <Button
          onClick={onScan}
          disabled={loading}
          className="w-full mt-4 h-auto py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-zinc-950 font-semibold disabled:opacity-40 gap-2"
        >
          {loading
            ? <><span className="animate-spin inline-block text-base">◌</span> {LOAD_STEPS[loadStep]}</>
            : hasResult ? <><RotateCcw size={16} /> Volver a analizar</> : <><Sparkles size={16} /> Analizar con IA</>}
        </Button>
      )}

      {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}
    </>
  );
}
