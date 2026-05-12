"use client";

import { type Tab } from "./types";

interface ScanTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function ScanTabs({ activeTab, onTabChange }: ScanTabsProps) {
  return (
    <div className="flex gap-1 bg-gray-100/80 dark:bg-zinc-900/80 rounded-xl p-1 mb-4 border border-gray-200/60 dark:border-zinc-800/60">
      <button
        onClick={() => onTabChange("ai")}
        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "ai" ? "bg-brand-500 text-zinc-950 shadow-sm" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"}`}
      >
        IA Vision
      </button>
      <button
        onClick={() => onTabChange("barcode")}
        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "barcode" ? "bg-brand-500 text-zinc-950 shadow-sm" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white"}`}
      >
        Código de barras
      </button>
    </div>
  );
}
