"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import PageShell from "@/components/PageShell";
import EmptyState from "@/components/EmptyState";

type Alert = {
  id: string;
  type: "time" | "calorie";
  label: string;
  time: string | null;
  threshold: number | null;
  enabled: number;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "time", label: "", time: "18:00", threshold: "2500" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setAlerts(data);
    });
  }, []);

  async function handleAdd() {
    if (!form.label.trim()) return;
    setSaving(true);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.type,
        label: form.label.trim(),
        time: form.type === "time" ? form.time : null,
        threshold: form.type === "calorie" ? parseFloat(form.threshold) : null,
      }),
    });
    if (res.ok) {
      const newAlert = await res.json();
      setAlerts((prev) => [newAlert, ...prev]);
      setAdding(false);
      setForm({ type: "time", label: "", time: "18:00", threshold: "2500" });
    }
    setSaving(false);
  }

  async function handleToggle(id: string, currentEnabled: number) {
    const enabled = currentEnabled ? 0 : 1;
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    await fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  }

  async function handleDelete(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/alerts/${id}`, { method: "DELETE" });
  }

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔔 Recordatorios</h1>
        <p className="text-gray-400 dark:text-zinc-500 text-sm mt-1">Recordatorios y avisos personalizados</p>
      </header>

      <div className="space-y-2">
        {alerts.length === 0 && !adding && <EmptyState message="Sin alertas. ¡Añade una!" />}

        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <button
              onClick={() => handleToggle(alert.id, alert.enabled)}
              className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                alert.enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  alert.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white truncate">{alert.label}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">
                {alert.type === "time" ? `⏰ ${alert.time}` : `🔥 ${alert.threshold} kcal`}
              </p>
            </div>
            <button
              onClick={() => handleDelete(alert.id)}
              className="text-gray-300 dark:text-zinc-600 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        {adding && (
          <div className="bg-gray-50 dark:bg-zinc-900 border border-brand-500/40 rounded-xl px-4 py-4 space-y-3">
            <div className="flex gap-2">
              {(["time", "calorie"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.type === t
                      ? "bg-brand-500 text-zinc-950"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {t === "time" ? "⏰ Hora" : "🔥 Calorías"}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder={form.type === "time" ? "ej: Tomar magnesio" : "ej: Límite de calorías"}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />

            {form.type === "time" ? (
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: e.target.value })}
                  className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <span className="text-gray-400 dark:text-zinc-500 text-sm">kcal</span>
              </div>
            )}

            {form.type === "calorie" && (
              <p className="text-xs text-gray-300 dark:text-zinc-600">Las alertas de calorías se muestran al abrir la app</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!form.label.trim() || saving}
                className="flex-1 py-2 rounded-lg bg-brand-500 text-zinc-950 text-sm font-semibold disabled:opacity-40 transition-opacity"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-sm hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="mt-4 w-full py-3 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:border-gray-400 dark:hover:border-zinc-500 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          Añadir alerta
        </button>
      )}

    </PageShell>
  );
}
