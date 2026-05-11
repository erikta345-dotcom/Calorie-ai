"use client";

import { useEffect, useState } from "react";
import { subDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "next-themes";

type Period = "week" | "month" | "year";

type DaySummary = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const VIEWS = [
  { key: "calories", label: "Calorías", color: "#84cc16" },
  { key: "protein", label: "Proteína", color: "#f97316" },
  { key: "carbs", label: "Carbos", color: "#3b82f6" },
  { key: "fat", label: "Grasa", color: "#eab308" },
] as const;

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "year", label: "Año" },
];

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"calories" | "protein" | "carbs" | "fat">("calories");
  const [goalCalories, setGoalCalories] = useState(2800);
  const [goalProtein, setGoalProtein] = useState(150);
  const [goalCarbs, setGoalCarbs] = useState(300);
  const [goalFat, setGoalFat] = useState(80);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const to = format(today, "yyyy-MM-dd");

    let from: string;
    if (period === "week") from = format(subDays(today, 6), "yyyy-MM-dd");
    else if (period === "month") from = format(subDays(today, 29), "yyyy-MM-dd");
    else from = format(subDays(today, 364), "yyyy-MM-dd");

    Promise.all([
      fetch(`/api/entries?from=${from}&to=${to}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([entries, settings]) => {
      if (settings && !settings.error) {
        setGoalCalories(settings.goalCalories);
        setGoalProtein(settings.goalProtein);
        setGoalCarbs(settings.goalCarbs);
        setGoalFat(settings.goalFat);
      }

      const rawEntries = Array.isArray(entries) ? entries as any[] : [];

      if (period === "year") {
        const monthMap: Record<string, DaySummary> = {};
        rawEntries.forEach((e) => {
          const month = (e.date as string).slice(0, 7);
          if (!monthMap[month]) {
            const d = new Date(parseInt(month.slice(0, 4)), parseInt(month.slice(5, 7)) - 1, 1);
            monthMap[month] = {
              date: month,
              label: format(d, "MMM", { locale: es }),
              calories: 0, protein: 0, carbs: 0, fat: 0,
            };
          }
          monthMap[month].calories += e.calories;
          monthMap[month].protein += e.protein;
          monthMap[month].carbs += e.carbs;
          monthMap[month].fat += e.fat;
        });
        const months: DaySummary[] = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
          const month = format(d, "yyyy-MM");
          return monthMap[month] ?? {
            date: month,
            label: format(d, "MMM", { locale: es }),
            calories: 0, protein: 0, carbs: 0, fat: 0,
          };
        });
        setData(months);
      } else {
        const days = period === "week" ? 7 : 30;
        const dateMap: Record<string, DaySummary> = {};
        rawEntries.forEach((e) => {
          if (!dateMap[e.date]) {
            const d = parseISO(e.date);
            dateMap[e.date] = {
              date: e.date,
              label: period === "week"
                ? format(d, "EEE", { locale: es })
                : format(d, "d/M"),
              calories: 0, protein: 0, carbs: 0, fat: 0,
            };
          }
          dateMap[e.date].calories += e.calories;
          dateMap[e.date].protein += e.protein;
          dateMap[e.date].carbs += e.carbs;
          dateMap[e.date].fat += e.fat;
        });
        const summaries: DaySummary[] = Array.from({ length: days }, (_, i) => {
          const d = subDays(today, days - 1 - i);
          const date = format(d, "yyyy-MM-dd");
          return dateMap[date] ?? {
            date,
            label: period === "week"
              ? format(d, "EEE", { locale: es })
              : format(d, "d/M"),
            calories: 0, protein: 0, carbs: 0, fat: 0,
          };
        });
        setData(summaries);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const currentView = VIEWS.find((v) => v.key === view)!;
  const goals = { calories: goalCalories, protein: goalProtein, carbs: goalCarbs, fat: goalFat };
  const currentGoal = goals[view];
  const avg = data.length
    ? Math.round(data.reduce((s, d) => s + d[view], 0) / data.length)
    : 0;

  const tickColor = dark ? "#71717a" : "#9ca3af";
  const tooltipBg = dark ? "#18181b" : "#ffffff";
  const tooltipBorder = dark ? "#3f3f46" : "#e5e7eb";
  const tooltipLabelColor = dark ? "#fff" : "#111827";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-md mx-auto pb-32 px-4">
      <header className="pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Historial</h1>
      </header>

      {/* Period toggle */}
      <div className="flex gap-2 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white"
                : "bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-500"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Metric tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              view === v.key ? "text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"
            }`}
            style={view === v.key ? { backgroundColor: v.color } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stat summary */}
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-4 flex justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-zinc-500">Promedio diario</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{avg}</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
        </div>
        {currentGoal && (
          <div className="text-right">
            <p className="text-xs text-gray-400 dark:text-zinc-500">Objetivo</p>
            <p className="text-2xl font-bold" style={{ color: currentView.color }}>{currentGoal}</p>
            <p className="text-xs text-gray-400 dark:text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse mb-4" />
      ) : (
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }}
                labelStyle={{ color: tooltipLabelColor }}
                itemStyle={{ color: currentView.color }}
                formatter={(val: number) => [
                  `${Math.round(val)} ${view === "calories" ? "kcal" : "g"}`,
                  currentView.label,
                ]}
              />
              {currentGoal && (
                <ReferenceLine y={currentGoal} stroke={currentView.color} strokeDasharray="4 4" strokeOpacity={0.5} />
              )}
              <Bar dataKey={view} fill={currentView.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Day/month cards with fill */}
      <div className="space-y-2">
        {[...data].reverse().map((day) => {
          const calPct = Math.min((day.calories / goalCalories) * 100, 100);
          const totalMacros = day.protein + day.carbs + day.fat;
          const proteinPct = totalMacros > 0 ? (day.protein / totalMacros) * 100 : 0;
          const carbsPct = totalMacros > 0 ? (day.carbs / totalMacros) * 100 : 0;
          const fatPct = totalMacros > 0 ? (day.fat / totalMacros) * 100 : 0;
          const overGoal = day.calories > goalCalories;
          const isEmpty = day.calories === 0;

          let dateLabel: string;
          if (period === "year") {
            const d = new Date(parseInt(day.date.slice(0, 4)), parseInt(day.date.slice(5, 7)) - 1, 1);
            dateLabel = format(d, "MMMM yyyy", { locale: es });
          } else {
            dateLabel = format(parseISO(day.date + "T12:00:00"), "EEEE d MMM", { locale: es });
          }

          return (
            <div key={day.date} className="relative bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {/* calorie fill */}
              {!isEmpty && (
                <div
                  className="absolute inset-0 transition-all duration-500"
                  style={{
                    width: `${calPct}%`,
                    backgroundColor: overGoal
                      ? (dark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)")
                      : (dark ? "rgba(132,204,22,0.07)" : "rgba(132,204,22,0.09)"),
                  }}
                />
              )}
              <div className="relative z-10 px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{dateLabel}</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {isEmpty
                      ? "Sin registros"
                      : `P: ${Math.round(day.protein)}g · C: ${Math.round(day.carbs)}g · G: ${Math.round(day.fat)}g`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${overGoal ? "text-red-400" : isEmpty ? "text-gray-300 dark:text-zinc-600" : "text-gray-900 dark:text-white"}`}>
                    {isEmpty ? "—" : Math.round(day.calories)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500">kcal</p>
                </div>
              </div>
              {/* macro bar */}
              {!isEmpty && (
                <div className="h-1 flex">
                  <div className="bg-orange-500 transition-all" style={{ width: `${proteinPct}%` }} />
                  <div className="bg-blue-500 transition-all" style={{ width: `${carbsPct}%` }} />
                  <div className="bg-yellow-500 transition-all" style={{ width: `${fatPct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
