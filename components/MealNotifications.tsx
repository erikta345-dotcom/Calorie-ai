"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

async function getMealTimes(): Promise<Record<string, string>> {
  try {
    const res = await fetch("/api/settings");
    if (!res.ok) return {};
    const s = await res.json();
    const raw = s?.mealTimes;
    return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
  } catch { return {}; }
}

async function subscribeAndSave() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  const vapidRes = await fetch("/api/push/vapid-key");
  if (!vapidRes.ok) return false;
  const { key } = await vapidRes.json();
  if (!key) return false;

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {}

  const reg = await navigator.serviceWorker.ready;

  // Always unsubscribe and resubscribe to ensure VAPID keys are current
  const existing = await reg.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  const mealTimes = await getMealTimes();
  const utcOffset = -new Date().getTimezoneOffset();

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), mealTimes, utcOffset }),
  });

  return true;
}

async function updateSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const mealTimes = await getMealTimes();
  const utcOffset = -new Date().getTimezoneOffset();

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), mealTimes, utcOffset }),
  });
}

export default function MealNotifications() {
  const { status } = useSession();
  const [perm, setPerm] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPerm(Notification.permission);

    async function init() {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {}
    }
    init();

    const handler = () => updateSubscription().catch(() => {});
    window.addEventListener("meal-times-updated", handler);
    return () => window.removeEventListener("meal-times-updated", handler);
  }, []);

  // Re-sync meal times once session is confirmed authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    updateSubscription().catch(() => {});
  }, [status]);

  if (perm === "denied") {
    return (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-gray-50 dark:bg-zinc-900 border border-yellow-500/40 text-yellow-400 text-xs px-4 py-2 rounded-xl shadow-lg text-center max-w-xs pointer-events-none">
        🔔 Notificaciones bloqueadas — actívalas en ajustes del navegador
      </div>
    );
  }
  return null;
}

export { subscribeAndSave };
