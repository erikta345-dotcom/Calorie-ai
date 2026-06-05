"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PageShell from "@/components/PageShell";
import { useSubscription } from "@/hooks/useSubscription";

type Plan = "pro_monthly" | "pro_annual" | "elite_monthly" | "elite_annual";

const TIERS = [
  {
    id: "free" as const,
    name: "Free",
    price: { monthly: "0€", annual: "0€" },
    color: "#71717a",
    badge: null,
    features: [
      { label: "Registro manual de comidas", ok: true },
      { label: "Escaneo por código de barras", ok: true },
      { label: "3 escaneos IA por día", ok: true },
      { label: "Historial 7 días", ok: true },
      { label: "Búsqueda de alimentos", ok: true },
      { label: "Recetas guardadas", ok: false },
      { label: "Exportar datos CSV", ok: false },
      { label: "Historial 30 días", ok: false },
      { label: "Seguimiento de peso", ok: false },
      { label: "Push notifications", ok: false },
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: { monthly: "4,99€/mes", annual: "29,99€/año" },
    color: "#84cc16",
    badge: "Popular",
    features: [
      { label: "Registro manual de comidas", ok: true },
      { label: "Escaneo por código de barras", ok: true },
      { label: "Escaneos IA ilimitados", ok: true },
      { label: "Historial 30 días", ok: true },
      { label: "Búsqueda de alimentos", ok: true },
      { label: "Recetas guardadas", ok: true },
      { label: "Exportar datos CSV", ok: true },
      { label: "Streaks y estadísticas", ok: true },
      { label: "Seguimiento de peso", ok: false },
      { label: "Push notifications", ok: false },
    ],
  },
  {
    id: "elite" as const,
    name: "Elite",
    price: { monthly: "9,99€/mes", annual: "59,99€/año" },
    color: "#f97316",
    badge: "Todo incluido",
    features: [
      { label: "Todo lo de Pro", ok: true },
      { label: "Historial 1 año", ok: true },
      { label: "Seguimiento de peso", ok: true },
      { label: "Push notifications", ok: true },
      { label: "Exportar datos CSV", ok: true },
      { label: "Estadísticas avanzadas", ok: true },
      { label: "Soporte prioritario", ok: true },
      { label: "Acceso anticipado a nuevas features", ok: true },
    ],
  },
] as const;

export default function PricingPage() {
  const { data: session } = useSession();
  const { tier: currentTier } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function checkout(plan: Plan) {
    if (!session) { router.push("/login"); return; }
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Planes</h1>
        <p className="text-sm text-gray-400 dark:text-zinc-500">Sin compromisos. Cancela cuando quieras.</p>
      </header>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-800/60 rounded-xl">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              billing === "monthly"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              billing === "annual"
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            Anual
            <span className="text-[10px] font-bold text-lime-500 bg-lime-500/10 px-1.5 py-0.5 rounded-full">-50%</span>
          </button>
        </div>
      </div>

      {/* Tier cards */}
      <div className="space-y-4 pb-8">
        {TIERS.map((tier) => {
          const isCurrent = currentTier === tier.id;
          const isPro = tier.id === "pro";
          const isElite = tier.id === "elite";
          const plan: Plan | null =
            tier.id === "free" ? null
            : tier.id === "pro" ? (billing === "monthly" ? "pro_monthly" : "pro_annual")
            : (billing === "monthly" ? "elite_monthly" : "elite_annual");

          return (
            <div
              key={tier.id}
              className={`relative bg-gray-50 dark:bg-zinc-900 border rounded-2xl overflow-hidden ${
                isPro ? "border-lime-500/50" : isElite ? "border-orange-500/30" : "border-gray-200 dark:border-zinc-800"
              }`}
            >
              {tier.badge && (
                <div
                  className="absolute top-4 right-4 text-[11px] font-bold px-2 py-0.5 rounded-full text-black"
                  style={{ backgroundColor: tier.color }}
                >
                  {tier.badge}
                </div>
              )}

              <div className="p-5">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-bold" style={{ color: tier.color }}>{tier.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    {billing === "monthly" ? tier.price.monthly.split("/")[0] : tier.price.annual.split("/")[0]}
                  </span>
                  {tier.id !== "free" && (
                    <span className="text-sm text-gray-400 dark:text-zinc-500">
                      /{billing === "monthly" ? "mes" : "año"}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 mb-5">
                  {tier.features.map((f) => (
                    <li key={f.label} className="flex items-center gap-2.5 text-sm">
                      <span className={f.ok ? "text-lime-500" : "text-gray-300 dark:text-zinc-700"}>
                        {f.ok ? "✓" : "✕"}
                      </span>
                      <span className={f.ok ? "text-gray-700 dark:text-zinc-300" : "text-gray-400 dark:text-zinc-600"}>
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>

                {tier.id === "free" ? (
                  <div
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center ${
                      isCurrent
                        ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                    }`}
                  >
                    {isCurrent ? "Plan actual" : "Gratis siempre"}
                  </div>
                ) : (
                  <button
                    onClick={() => plan && checkout(plan)}
                    disabled={isCurrent || !!loading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 text-black"
                    style={{ backgroundColor: isCurrent ? "#3f3f46" : tier.color }}
                  >
                    {loading === plan ? "Redirigiendo..." : isCurrent ? "Plan actual" : `Elegir ${tier.name}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
