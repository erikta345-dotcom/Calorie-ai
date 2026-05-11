"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex items-center justify-between w-full py-3 border-b border-gray-200 dark:border-zinc-800 last:border-0"
    >
      <div>
        <p className="text-sm text-gray-900 dark:text-white text-left">Apariencia</p>
        <p className="text-xs text-gray-400 dark:text-zinc-500">{dark ? "Modo oscuro" : "Modo claro"}</p>
      </div>
      <div className={`w-12 h-6 rounded-full relative transition-colors ${dark ? "bg-brand-500" : "bg-gray-200"}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${dark ? "translate-x-6" : "translate-x-0"}`} />
      </div>
    </button>
  );
}
