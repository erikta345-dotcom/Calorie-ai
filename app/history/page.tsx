"use client";

import { useEffect, useState } from "react";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import BottomNav from "@/components/BottomNav";

type DaySummary = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export default function HistoryPage() {
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calories" | "protein" | "carbs" | "fat">("calories");
  const [goalCalories, setGoalCalories] = useState(2800);
  const [goalProtein, setGoalProtein] = useState(150);

  useEffect(() => {
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return format(d, "yyyy-MM-dd");
    });

    Promise.all([
      ...last7.map((date) => fetch(`/api/entries?date=${date}`).then((r) => r.json())),
      fetch("/api/settings").then((r) => r.json()),
    ]).then((results) => {
      const settings = results[7];
      if (settings && !settings.error) {
        setGoalCalories(settings.goalCalories);
        setGoalProtein(settings.goalProtein);
      }
      const summaries: DaySummary[] = last7.map((date, i) => {
        const entries = Array.isArray(results[i]) ? results[i] as any[] : [];
        return {
          date,
          label: format(new Date(date + "T12:00:00"), "EEE", { locale: es }),
          calories: entries.reduce((s: number, e: any) => s + e.calories, 0),
          protein: entries.reduce((s: number, e: any) => s + e.protein, 0),
          carbs: entries.reduce((s: number, e: any) => s + e.carbs, 0),
          fat: entries.reduce((s: number, e: any) => s + e.fat, 0),
        };
      });
      setData(summaries);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const VIEWS = [
    { key: "calories", label: "Calorías", color: "#84cc16", goal: goalCalories },
    { key: "protein", label: "Proteína", color: "#f97316", goal: goalProtein },
    { key: "carbs", label: "Carbos", color: "#3b82f6", goal: null },
    { key: "fat", label: "Grasa", color: "#eab308", goal: null },
  ] as const;

  const current = VIEWS.find((v) => v.key === view)!;

  const avg = data.length
    ? Math.round(data.reduce((s, d) => s + (d[view] as number), 0) / data.length)
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-6">
        <h1 className="text-2xl font-bold text-white">📊 Historial</h1>
        <p className="text-zinc-500 text-sm mt-1">Últimos 7 días</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              view === v.key
                ? "text-white"
                : "bg-zinc-800 text-zinc-400"
            }`}
            style={view === v.key ? { backgroundColor: v.color } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stat summary */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 flex justify-between">
        <div>
          <p className="text-xs text-zinc-500">Promedio diario</p>
          <p className="text-2xl font-bold text-white">{avg}</p>
          <p className="text-xs text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
        </div>
        {current.goal && (
          <div className="text-right">
            <p className="text-xs text-zinc-500">Objetivo</p>
            <p className="text-2xl font-bold" style={{ color: current.color }}>{current.goal}</p>
            <p className="text-xs text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 bg-zinc-800 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: current.color }}
                formatter={(val: number) => [
                  `${Math.round(val)} ${view === "calories" ? "kcal" : "g"}`,
                  current.label,
                ]}
              />
              {current.goal && (
                <ReferenceLine y={current.goal} stroke={current.color} strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              <Bar dataKey={view} fill={current.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista detallada */}
      <div className="mt-4 space-y-2">
        {[...data].reverse().map((day) => (
          <div key={day.date} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-white capitalize">
                {format(new Date(day.date + "T12:00:00"), "EEEE d MMM", { locale: es })}
              </p>
              <p className="text-xs text-zinc-500">
                P: {Math.round(day.protein)}g · C: {Math.round(day.carbs)}g · G: {Math.round(day.fat)}g
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-white">{Math.round(day.calories)}</p>
              <p className="text-xs text-zinc-500">kcal</p>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
