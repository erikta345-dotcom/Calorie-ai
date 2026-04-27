"use client";

import { useEffect, useState } from "react";

async function sendToSW(meals: Record<string, string>) {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "SET_MEAL_TIMES", meals });
  } catch {}
}

async function setup(meals: Record<string, string>) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
  await navigator.serviceWorker.register("/sw.js");
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  if (Notification.permission === "granted") {
    await sendToSW(meals);
  }
}

export default function MealNotifications() {
  const [permState, setPermState] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if ("Notification" in window) setPermState(Notification.permission);

    async function init() {
      try {
        const res = await fetch("/api/settings");
        const s = await res.json();
        const raw = s?.mealTimes;
        const meals: Record<string, string> = raw
          ? (typeof raw === "string" ? JSON.parse(raw) : raw)
          : {};
        await setup(meals);
        if ("Notification" in window) setPermState(Notification.permission);
      } catch {}
    }

    init();

    // Re-send when settings are saved
    const handler = async () => {
      try {
        const res = await fetch("/api/settings");
        const s = await res.json();
        const raw = s?.mealTimes;
        const meals: Record<string, string> = raw
          ? (typeof raw === "string" ? JSON.parse(raw) : raw)
          : {};
        await sendToSW(meals);
      } catch {}
    };

    window.addEventListener("meal-times-updated", handler);
    return () => window.removeEventListener("meal-times-updated", handler);
  }, []);

  // Show a prompt if notifications are blocked or not yet asked
  if (permState === "denied") {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-yellow-500/40 text-yellow-400 text-xs px-4 py-2 rounded-xl shadow-lg text-center max-w-xs">
        🔔 Notificaciones bloqueadas — actívalas en ajustes del navegador
      </div>
    );
  }

  return null;
}
