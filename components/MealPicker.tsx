"use client";

import { VALID_MEALS } from "@/lib/constants";

export default function MealPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {VALID_MEALS.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
            value === m ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
