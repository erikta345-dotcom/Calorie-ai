"use client";

import { useEffect, useState, useMemo } from "react";
import { subDays, format, parseISO, getDaysInMonth } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import PageShell from "@/components/PageShell";
import { useTheme } from "next-themes";

type Period = "week" | "month" | "year";
type Metric = "calories" | "protein" | "carbs" | "fat";

type DaySummary = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const VIEWS = [
  { key: "calories" as Metric, label: "Calorías", color: "#84cc16", unit: "kcal" },
  { key: "protein" as Metric, label: "Proteína", color: "#f97316", unit: "g" },
  { key: "carbs" as Metric, label: "Carbos", color: "#3b82f6", unit: "g" },
  { key: "fat" as Metric, label: "Grasa", color: "#eab308", unit: "g" },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "7 días" },
  { key: "month", label: "30 días" },
  { key: "year", label: "12 meses" },
];

export default function HistoryPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<Metric>("calories");
  const [goals, setGoals] = useState({ calories: 2800, protein: 150, carbs: 300, fat: 80 });
  const [tableOpen, setTableOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const to = format(today, "yyyy-MM-dd");
    const days = period === "week" ? 6 : period === "month" ? 29 : 364;
    const from = format(subDays(today, days), "yyyy-MM-dd");

    Promise.all([
      fetch(`/api/entries?from=${from}&to=${to}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([entries, settings]) => {
      if (settings && !settings.error) {
        setGoals({
          calories: settings.goalCalories,
          protein: settings.goalProtein,
          carbs: settings.goalCarbs,
          fat: settings.goalFat,
        });
      }

      const raw = Array.isArray(entries) ? entries as any[] : [];

      if (period === "year") {
        const monthMap: Record<string, DaySummary> = {};
        const monthDays: Record<string, Set<string>> = {};
        raw.forEach((e) => {
          const month = (e.date as string).slice(0, 7);
          if (!monthMap[month]) {
            const d = new Date(+month.slice(0, 4), +month.slice(5, 7) - 1, 1);
            monthMap[month] = { date: month, label: format(d, "MMM", { locale: es }), calories: 0, protein: 0, carbs: 0, fat: 0 };
          }
          if (!monthDays[month]) monthDays[month] = new Set();
          monthDays[month].add(e.date as string);
          monthMap[month].calories += e.calories;
          monthMap[month].protein += e.protein;
          monthMap[month].carbs += e.carbs;
          monthMap[month].fat += e.fat;
        });
        setData(Array.from({ length: 12 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
          const month = format(d, "yyyy-MM");
          const r = monthMap[month];
          const n = monthDays[month]?.size || 1;
          return r
            ? { ...r, calories: r.calories / n, protein: r.protein / n, carbs: r.carbs / n, fat: r.fat / n }
            : { date: month, label: format(d, "MMM", { locale: es }), calories: 0, protein: 0, carbs: 0, fat: 0 };
        }));
      } else {
        const count = period === "week" ? 7 : 30;
        const dateMap: Record<string, DaySummary> = {};
        raw.forEach((e) => {
          if (!dateMap[e.date]) {
            const d = parseISO(e.date);
            dateMap[e.date] = {
              date: e.date,
              label: period === "week" ? format(d, "EEE", { locale: es }) : format(d, "d/M"),
              calories: 0, protein: 0, carbs: 0, fat: 0,
            };
          }
          dateMap[e.date].calories += e.calories;
          dateMap[e.date].protein += e.protein;
          dateMap[e.date].carbs += e.carbs;
          dateMap[e.date].fat += e.fat;
        });
        setData(Array.from({ length: count }, (_, i) => {
          const d = subDays(today, count - 1 - i);
          const date = format(d, "yyyy-MM-dd");
          return dateMap[date] ?? {
            date, calories: 0, protein: 0, carbs: 0, fat: 0,
            label: period === "week" ? format(d, "EEE", { locale: es }) : format(d, "d/M"),
          };
        }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const currentView = VIEWS.find((v) => v.key === view)!;
  const currentGoal = goals[view];

  const stats = useMemo(() => {
    const active = data.filter((d) => d[view] > 0);
    if (!active.length) return null;

    const avg = Math.round(active.reduce((s, d) => s + d[view], 0) / active.length);
    const max = active.reduce((best, d) => d[view] > best[view] ? d : best, active[0]);
    const min = active.reduce((low, d) => d[view] < low[view] ? d : low, active[0]);
    const daysOnTrack = currentGoal > 0 ? active.filter((d) => d[view] <= currentGoal).length : active.length;
    const goalPct = currentGoal > 0 ? Math.round((daysOnTrack / active.length) * 100) : 100;

    const loggedSet = new Set(data.filter((d) => d.calories > 0).map((d) => d.date));
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      if (loggedSet.has(format(subDays(today, i), "yyyy-MM-dd"))) streak++;
      else break;
    }

    const half = Math.floor(active.length / 2);
    const firstAvg = half > 0 ? active.slice(0, half).reduce((s, d) => s + d[view], 0) / half : 0;
    const secondAvg = half > 0 ? active.slice(half).reduce((s, d) => s + d[view], 0) / (active.length - half) : 0;
    const trend = firstAvg === 0 ? null
      : secondAvg > firstAvg * 1.03 ? "up"
      : secondAvg < firstAvg * 0.97 ? "down"
      : "flat";

    return { avg, max, min, daysOnTrack, daysLogged: active.length, goalPct, streak, trend };
  }, [data, view, currentGoal]);

  const tickColor = dark ? "#52525b" : "#9ca3af";
  const tooltipBg = dark ? "#18181b" : "#ffffff";
  const tooltipBorder = dark ? "#3f3f46" : "#e5e7eb";

  const trendColor = stats?.trend === "flat" ? "text-zinc-500"
    : view === "calories"
      ? stats?.trend === "up" ? "text-red-400" : "text-lime-500"
      : stats?.trend === "up" ? "text-lime-500" : "text-red-400";

  const trendIcon = stats?.trend === "up" ? "↑" : stats?.trend === "down" ? "↓" : "→";

  return (
    <PageShell className="px-4">
      <header className="pt-14 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h1>
        {(stats?.streak ?? 0) > 0 && (
          <div className="flex items-center gap-1 bg-orange-500/10 px-3 py-1.5 rounded-full">
            <span className="text-base">🔥</span>
            <span className="text-sm font-bold text-orange-400">{stats!.streak}</span>
            <span className="text-xs text-orange-400/70">días</span>
          </div>
        )}
      </header>

      {/* Period selector */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-zinc-800/60 rounded-xl">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
              period === p.key
                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-zinc-500"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 mb-5">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              view === v.key ? "text-black" : "bg-gray-100 dark:bg-zinc-800/60 text-gray-500 dark:text-zinc-400"
            }`}
            style={view === v.key ? { backgroundColor: v.color } : {}}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[78px] bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Average + trend */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Promedio diario</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.avg.toLocaleString()}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{currentView.unit}</span>
              {stats.trend && (
                <span className={`text-sm font-bold ml-auto ${trendColor}`}>{trendIcon}</span>
              )}
            </div>
            {currentGoal > 0 && (
              <p className="text-[11px] mt-1" style={{ color: currentView.color }}>
                obj. {currentGoal.toLocaleString()} {currentView.unit}
              </p>
            )}
          </div>

          {/* Goal % */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">En objetivo</p>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${
                stats.goalPct >= 70 ? "text-lime-500" : stats.goalPct >= 40 ? "text-yellow-500" : "text-red-400"
              }`}>{stats.goalPct}%</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1">
              {stats.daysOnTrack} de {stats.daysLogged} días
            </p>
          </div>

          {/* Max day */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Máximo</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(stats.max[view]).toLocaleString()}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{currentView.unit}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 capitalize">
              {period === "year"
                ? stats.max.label
                : format(parseISO(stats.max.date + "T12:00:00"), "EEE d MMM", { locale: es })}
            </p>
          </div>

          {/* Min day */}
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3">
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-1">Mínimo</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900 dark:text-white">{Math.round(stats.min[view]).toLocaleString()}</span>
              <span className="text-xs text-gray-400 dark:text-zinc-500">{currentView.unit}</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 capitalize">
              {period === "year"
                ? stats.min.label
                : format(parseISO(stats.min.date + "T12:00:00"), "EEE d MMM", { locale: es })}
            </p>
          </div>
        </div>
      ) : !loading ? (
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 text-center mb-5">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-gray-400 dark:text-zinc-500">Sin datos en este período</p>
        </div>
      ) : null}

      {/* Chart */}
      {loading ? (
        <div className="h-52 bg-gray-100 dark:bg-zinc-800 rounded-xl animate-pulse mb-5" />
      ) : data.length > 0 && (
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-5">
          {period === "year" && (
            <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">Promedio diario por mes</p>
          )}
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -25 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: tickColor, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={period === "month" ? 4 : 0}
              />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: dark ? "#fff" : "#111" }}
                formatter={(val: number) => [`${Math.round(val)} ${currentView.unit}`, currentView.label]}
              />
              {currentGoal > 0 && (
                <ReferenceLine y={currentGoal} stroke={currentView.color} strokeDasharray="4 4" strokeOpacity={0.4} />
              )}
              <Bar dataKey={view} radius={[4, 4, 0, 0]}>
                {data.map((d, i) => {
                  const val = d[view];
                  const fill = val === 0
                    ? (dark ? "#27272a" : "#e4e4e7")
                    : view === "calories" && currentGoal > 0 && val > currentGoal
                    ? "#f97316"
                    : currentView.color;
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary table */}
      {!loading && data.some((d) => d.calories > 0) && (
        <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl mb-5 overflow-hidden">
          <button
            onClick={() => setTableOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {period === "week" ? "Tabla semanal" : period === "month" ? "Tabla mensual" : "Tabla anual"}
            </span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">{tableOpen ? "▲" : "▼"}</span>
          </button>
          {tableOpen && (
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 dark:text-zinc-500">
                    <th className="text-left pb-2 font-medium">{period === "year" ? "Mes" : "Fecha"}</th>
                    <th className="text-right pb-2 font-medium">Kcal</th>
                    <th className="text-right pb-2 font-medium">Prot.</th>
                    <th className="text-right pb-2 font-medium">Carbs</th>
                    <th className="text-right pb-2 font-medium">Grasa</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((day) => {
                    const has = day.calories > 0;
                    const over = has && day.calories > goals.calories;
                    const label = period === "year"
                      ? day.label
                      : format(parseISO(day.date + "T12:00:00"), period === "week" ? "EEE d" : "d MMM", { locale: es });
                    return (
                      <tr key={day.date} className="border-t border-gray-100 dark:border-zinc-800">
                        <td className="py-1.5 text-gray-600 dark:text-zinc-400 capitalize">{label}</td>
                        <td className={`py-1.5 text-right font-medium ${!has ? "text-gray-300 dark:text-zinc-700" : over ? "text-orange-400" : "text-lime-500"}`}>
                          {has ? Math.round(day.calories) : "—"}
                        </td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">{has ? Math.round(day.protein) : "—"}</td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">{has ? Math.round(day.carbs) : "—"}</td>
                        <td className="py-1.5 text-right text-gray-700 dark:text-zinc-300">{has ? Math.round(day.fat) : "—"}</td>
                      </tr>
                    );
                  })}
                  {(() => {
                    const active = data.filter((d) => d.calories > 0);
                    if (!active.length) return null;
                    const a = {
                      cal: Math.round(active.reduce((s, d) => s + d.calories, 0) / active.length),
                      prot: Math.round(active.reduce((s, d) => s + d.protein, 0) / active.length),
                      carbs: Math.round(active.reduce((s, d) => s + d.carbs, 0) / active.length),
                      fat: Math.round(active.reduce((s, d) => s + d.fat, 0) / active.length),
                    };
                    return (
                      <tr className="border-t-2 border-gray-200 dark:border-zinc-700">
                        <td className="pt-2 text-gray-900 dark:text-white font-semibold">Promedio</td>
                        <td className={`pt-2 text-right font-semibold ${a.cal > goals.calories ? "text-orange-400" : "text-lime-500"}`}>{a.cal}</td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{a.prot}</td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{a.carbs}</td>
                        <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">{a.fat}</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Calendar heatmap — month only */}
      {period === "month" && !loading && (() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const totalDays = getDaysInMonth(firstDay);
        const startDow = (firstDay.getDay() + 6) % 7;
        const dataMap: Record<string, DaySummary> = {};
        data.forEach((d) => { dataMap[d.date] = d; });
        const DOW = ["L", "M", "X", "J", "V", "S", "D"];
        const todayStr = format(today, "yyyy-MM-dd");
        return (
          <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 mb-5">
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
                const date = format(new Date(today.getFullYear(), today.getMonth(), dayNum), "yyyy-MM-dd");
                const isFuture = date > todayStr;
                const cell = dataMap[date];
                const hasData = !isFuture && cell && cell.calories > 0;
                const over = hasData && cell.calories > goals.calories;
                const isToday = date === todayStr;
                return (
                  <div
                    key={date}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center ${
                      isFuture ? "" : hasData ? (over ? "bg-orange-400/20" : "bg-lime-400/20") : "bg-gray-100 dark:bg-zinc-800/60"
                    }`}
                    style={isToday ? { outline: `1.5px solid ${currentView.color}` } : {}}
                  >
                    <span className={`text-[11px] font-semibold leading-none ${
                      isFuture ? "text-gray-200 dark:text-zinc-700"
                        : hasData ? (over ? "text-orange-500" : "text-lime-600 dark:text-lime-400")
                        : "text-gray-400 dark:text-zinc-600"
                    }`}>{dayNum}</span>
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

      {/* Day cards — week and month */}
      {!loading && period !== "year" && (
        <div className="space-y-2 pb-4">
          {[...data].reverse().map((day) => {
            const isEmpty = day.calories === 0;
            const over = day.calories > goals.calories;
            const calPct = Math.min((day.calories / goals.calories) * 100, 100);
            const total = day.protein + day.carbs + day.fat;
            const protPct = total > 0 ? (day.protein / total) * 100 : 0;
            const carbPct = total > 0 ? (day.carbs / total) * 100 : 0;
            const fatPct = total > 0 ? (day.fat / total) * 100 : 0;
            const dateLabel = format(parseISO(day.date + "T12:00:00"), "EEEE d MMM", { locale: es });
            return (
              <div key={day.date} className="relative bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {!isEmpty && (
                  <div
                    className="absolute inset-0 transition-all duration-500"
                    style={{
                      width: `${calPct}%`,
                      backgroundColor: over
                        ? dark ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.06)"
                        : dark ? "rgba(132,204,22,0.07)" : "rgba(132,204,22,0.09)",
                    }}
                  />
                )}
                <div className="relative z-10 px-4 py-3 flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{dateLabel}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                      {isEmpty
                        ? "Sin registros"
                        : `P ${Math.round(day.protein)}g · C ${Math.round(day.carbs)}g · G ${Math.round(day.fat)}g`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-lg font-bold ${isEmpty ? "text-gray-300 dark:text-zinc-700" : over ? "text-orange-400" : "text-gray-900 dark:text-white"}`}>
                      {isEmpty ? "—" : Math.round(day.calories).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500">kcal</p>
                  </div>
                </div>
                {!isEmpty && (
                  <div className="h-1 flex">
                    <div className="bg-orange-500" style={{ width: `${protPct}%` }} />
                    <div className="bg-blue-500" style={{ width: `${carbPct}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${fatPct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
