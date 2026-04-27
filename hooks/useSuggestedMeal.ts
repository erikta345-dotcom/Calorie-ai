"use client";

import { useEffect, useState } from "react";

export type MealTimes = {
  desayuno: string;
  comida: string;
  merienda: string;
  cena: string;
  snack: string;
};

const DEFAULT_TIMES: MealTimes = {
  desayuno: "08:00",
  comida: "13:30",
  merienda: "17:00",
  cena: "20:30",
  snack: "11:00",
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function suggestMeal(times: MealTimes): string {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let best = "comida";
  let bestDiff = Infinity;
  for (const [meal, time] of Object.entries(times)) {
    const diff = Math.abs(toMinutes(time) - nowMins);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = meal;
    }
  }
  return best;
}

export function useSuggestedMeal(): { meal: string; mealTimes: MealTimes; loaded: boolean } {
  const [mealTimes, setMealTimes] = useState<MealTimes>(DEFAULT_TIMES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.mealTimes) {
          const parsed = typeof s.mealTimes === "string" ? JSON.parse(s.mealTimes) : s.mealTimes;
          setMealTimes({ ...DEFAULT_TIMES, ...parsed });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return { meal: suggestMeal(mealTimes), mealTimes, loaded };
}
