"use client";

import { useEffect, useState } from "react";
import { subDays, format, parseISO, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import PageShell from "@/components/PageShell";
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
  const [weekData, setWeekData] = useState<DaySummary[]>([]);
  const [weekOpen, setWeekOpen] = useState(false);
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
        const monthLoggedDays: Record<string, Set<string>> = {};
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
          if (!monthLoggedDays[month]) monthLoggedDays[month] = new Set();
          monthLoggedDays[month].add(e.date as string);
          monthMap[month].calories += e.calories;
          monthMap[month].protein += e.protein;
          monthMap[month].carbs += e.carbs;
          monthMap[month].fat += e.fat;
        });
        const months: DaySummary[] = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
          const month = format(d, "yyyy-MM");
          const raw = monthMap[month];
          const loggedDays = monthLoggedDays[month]?.size || 1;
          return raw
            ? {
                ...raw,
                calories: raw.calories / loggedDays,
                protein: raw.protein / loggedDays,
                carbs: raw.carbs / loggedDays,
                fat: raw.fat / loggedDays,
              }
            : {
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
        if (period === "week") setWeekData(summaries);
        setData(summaries);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const currentView = VIEWS.find((v) => v.key === view)!;
  const goals = { calories: goalCalories, protein: goalProtein, carbs: goalCarbs, fat: goalFat };
  const currentGoal = goals[view];

  const activeDays = data.filter((d) => d[view] > 0);
  const avg = activeDays.length
    ? Math.round(activeDays.reduce((s, d) => s + d[view], 0) / activeDays.length)
    : 0;
  const total = Math.round(data.reduce((s, d) => s + d[view], 0));
  const daysOnTrack = data.filter((d) => d[view] > 0 && d[view] <= currentGoal).length;
  const daysLogged = activeDays.length;

  // Trend: compare avg of first half vs second half of logged days
  const half = Math.floor(activeDays.length / 2);
  const firstHalfAvg = half > 0
    ? activeDays.slice(0, half).reduce((s, d) => s + d[view], 0) / half
    : 0;
  const secondHalfAvg = half > 0
    ? activeDays.slice(half).reduce((s, d) => s + d[view], 0) / (activeDays.length - half)
    : 0;
  const trend = firstHalfAvg === 0 ? null : secondHalfAvg > firstHalfAvg * 1.03 ? "up" : secondHalfAvg < firstHalfAvg * 0.97 ? "down" : "flat";

  const tickColor = dark ? "#71717a" : "#9ca3af";
  const tooltipBg = dark ? "#18181b" : "#ffffff";
  const tooltipBorder = dark ? "#3f3f46" : "#e5e7eb";
  const tooltipLabelColor = dark ? "#fff" : "#111827";

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = view === "calories"
    ? (trend === "up" ? "text-red-400" : trend === "down" ? "text-lime-500" : "text-gray-400 dark:text-zinc-500")
    : (trend === "up" ? "text-lime-500" : trend === "down" ? "text-red-400" : "text-gray-400 dark:text-zinc-500");

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Historial</h1>
      </header>

      {/* Weekly summary */}
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl mb-4 overflow-hidden">
        <button
          onClick={() => setWeekOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-white">📊 Resumen semanal</span>
          <span className="text-xs text-gray-400 dark:text-zinc-500">{weekOpen ? "▲" : "▼"}</span>
        </button>
        {weekOpen && (
          <div className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-zinc-500">
                    <th className="text-left pb-2 font-medium">Fecha</th>
                    <th className="text-right pb-2 font-medium">Kcal</th>
                    <th className="text-right pb-2 font-medium">Prot.</th>
                    <th className="text-right pb-2 font-medium">Carbos</th>
                    <th className="text-right pb-2 font-medium">Grasa</th>
                  </tr>
                </thead>
                <tbody>
                  {weekData.map((day) => {
                    const hasData = day.calories > 0;
                    const overGoal = day.calories > goalCalories;
                    const kcalColor = !hasData
                      ? "text-gray-300 dark:text-zinc-600"
                      : overGoal
                      ? "text-orange-400"
                      : "text-lime-500";
                    return (
                      <tr key={day.date} className="border-t border-gray-100 dark:border-zinc-800">
                        <td className="py-1.5 text-gray-600 dark:text-zinc-400 capitalize">
                          {format(parseISO(day.date + "T12:00:00"), "EEE d", { locale: es })}
                        </td>
                        <td className={`py-1.5 text-right font-medium ${kcalColor}`}>
                          {hasData ? Math.round(day.calories) : "—"}
                        </td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">
                          {hasData ? Math.round(day.protein) : "—"}
                        </td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">
                          {hasData ? Math.round(day.carbs) : "—"}
                        </td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">
                          {hasData ? Math.round(day.fat) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const active = weekData.filter((d) => d.calories > 0);
                    if (active.length === 0) return null;
                    const avgKcal = Math.round(active.reduce((s, d) => s + d.calories, 0) / active.length);
                    const avgProt = Math.round(active.reduce((s, d) => s + d.protein, 0) / active.length);
                    const avgCarbs = Math.round(active.reduce((s, d) => s + d.carbs, 0) / active.length);
                    const avgFat = Math.round(active.reduce((s, d) => s + d.fat, 0) / active.length);
                    const avgOverGoal = avgKcal > goalCalories;
                    return (
                      <tr className="border-t-2 border-gray-200 dark:border-zinc-700">
                        <td className="pt-2 text-gray-900 dark:text-white font-semibold">Promedio</td>
                        <td className={`pt-2 text-right font-semibold ${avgOverGoal ? "text-orange-400" : "text-lime-500"}`}>
                          {avgKcal}
                        </td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{avgProt}</td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{avgCarbs}</td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{avgFat}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
      <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
        <div className="flex justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Promedio diario</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avg}</p>
              {trend && (
                <span className={`text-sm font-semibold ${trendColor}`}>{trendIcon}</span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
          </div>
          {currentGoal > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400 dark:text-zinc-500">Objetivo</p>
              <p className="text-2xl font-bold" style={{ color: currentView.color }}>{currentGoal}</p>
              <p className="text-xs text-gray-400 dark:text-zinc-500">{view === "calories" ? "kcal" : "g"}</p>
            </div>
          )}
        </div>
        {/* Secondary stats row */}
        <div className="flex gap-4 pt-3 border-t border-gray-200 dark:border-zinc-800">
          <div>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Total</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {total.toLocaleString()} <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">{view === "calories" ? "kcal" : "g"}</span>
            </p>
          </div>
          {daysLogged > 0 && (
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Días registrados</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{daysLogged}</p>
            </div>
          )}
          {daysLogged > 0 && view === "calories" && (
            <div>
              <p className="text-xs text-gray-400 dark:text-zinc-500">Días en objetivo</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {daysOnTrack}
                <span className="text-xs font-normal text-gray-400 dark:text-zinc-500"> / {daysLogged}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse mb-4" />
      ) : (
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
          {period === "year" && (
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">Promedio diario por mes</p>
          )}
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
                  period === "year" ? `${currentView.label} (avg/día)` : currentView.label,
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

      {/* Month calendar grid */}
      {period === "month" && !loading && (() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const totalDays = getDaysInMonth(firstDay);
        const startDow = (firstDay.getDay() + 6) % 7;
        const dataMap: Record<string, DaySummary> = {};
        data.forEach((d) => { dataMap[d.date] = d; });
        const DOW = ["L", "M", "X", "J", "V", "S", "D"];
        const todayStr = format(today, "yyyy-MM-dd");
        return (
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-3 capitalize font-medium">
              {format(firstDay, "MMMM yyyy", { locale: es })}
            </p>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DOW.map((d) => <div key={d} className="text-center text-[10px] text-gray-400 dark:text-zinc-500 font-medium">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: totalDays }, (_, i) => {
                const dayNum = i + 1;
                const date = format(new Date(year, month, dayNum), "yyyy-MM-dd");
                const isFuture = date > todayStr;
                const cell = dataMap[date];
                const hasData = !isFuture && cell && cell.calories > 0;
                const overGoal = hasData && cell.calories > goalCalories;
                const isToday = date === todayStr;
                const bgClass = isFuture ? "" : hasData ? (overGoal ? "bg-orange-400/20" : "bg-lime-400/20") : "bg-gray-100 dark:bg-zinc-800/60";
                const textClass = isFuture ? "text-gray-200 dark:text-zinc-700" : hasData ? (overGoal ? "text-orange-500" : "text-lime-600 dark:text-lime-400") : "text-gray-400 dark:text-zinc-600";
                return (
                  <div key={date} className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0 ${bgClass} ${isToday ? "ring-1 ring-brand-500" : ""}`}>
                    <span className={`text-[11px] font-semibold leading-none ${textClass}`}>{dayNum}</span>
                    {hasData && (
                      <span className="text-[8px] leading-none mt-0.5 text-gray-400 dark:text-zinc-500">
                        {cell.calories >= 1000 ? `${(cell.calories / 1000).toFixed(1)}k` : Math.round(cell.calories)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Day/month cards */}
      <div className="space-y-2">
        {[...data].reverse().filter(() => period !== "month").map((day) => {
          const calPct = Math.min((day.calories / goalCalories) * 100, 100);
          const goalPct = currentGoal > 0 ? Math.round((day[view] / currentGoal) * 100) : 0;
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
                <div className="flex items-center gap-2">
                  {/* % of goal badge */}
                  {!isEmpty && currentGoal > 0 && (
                    <span
                      className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                        view === "calories"
                          ? overGoal
                            ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                            : "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400"
                          : goalPct >= 80
                          ? "bg-lime-100 dark:bg-lime-900/30 text-lime-600 dark:text-lime-400"
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500"
                      }`}
                    >
                      {goalPct}%
                    </span>
                  )}
                  <div className="text-right">
                    <p className={`font-bold ${overGoal ? "text-red-400" : isEmpty ? "text-gray-300 dark:text-zinc-600" : "text-gray-900 dark:text-white"}`}>
                      {isEmpty ? "—" : Math.round(day.calories)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">kcal</p>
                  </div>
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

    </PageShell>
  );
}
