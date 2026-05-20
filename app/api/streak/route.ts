import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuthOnly } from "@/lib/api-auth";
import { DATE_RE } from "@/lib/constants";

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function calcStreak(
  today: string,
  dailyMap: Map<string, { cal: number; protein: number; carbs: number; fat: number }>,
  check: (row: { cal: number; protein: number; carbs: number; fat: number }) => boolean
): number {
  const yesterStr = addDays(today, -1);

  const todayRow = dailyMap.get(today);
  const yesterRow = dailyMap.get(yesterStr);

  let cur: string | null = todayRow && check(todayRow)
    ? today
    : yesterRow && check(yesterRow)
    ? yesterStr
    : null;

  let streak = 0;
  while (cur) {
    const row = dailyMap.get(cur);
    if (row && check(row)) {
      streak++;
      cur = addDays(cur, -1);
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;

  const today = req.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_RE.test(today)) return NextResponse.json({ calories: 0, protein: 0, carbs: 0, fat: 0 }, { status: 400 });

  try {
    const [settingsResult, totalsResult] = await Promise.all([
      db.execute({ sql: "SELECT goalCalories, goalProtein, goalCarbs, goalFat FROM UserSettings WHERE id = ?", args: [uid] }),
      db.execute({
        sql: `SELECT date, SUM(calories) as cal, SUM(protein) as protein, SUM(carbs) as carbs, SUM(fat) as fat
              FROM FoodEntry WHERE userId = ? AND date >= date(?, '-90 days')
              GROUP BY date`,
        args: [uid, today],
      }),
    ]);

    const s = settingsResult.rows[0] as any;
    const goalCal = Number(s?.goalCalories ?? 2800);
    const goalProt = Number(s?.goalProtein ?? 150);
    const goalCarbs = Number(s?.goalCarbs ?? 300);
    const goalFat = Number(s?.goalFat ?? 80);

    const dailyMap = new Map<string, { cal: number; protein: number; carbs: number; fat: number }>();
    for (const r of totalsResult.rows as any[]) {
      dailyMap.set(r.date as string, {
        cal: Number(r.cal),
        protein: Number(r.protein),
        carbs: Number(r.carbs),
        fat: Number(r.fat),
      });
    }

    return NextResponse.json({
      calories: calcStreak(today, dailyMap, (r) => r.cal >= goalCal * 0.8 && r.cal <= goalCal * 1.1),
      protein: calcStreak(today, dailyMap, (r) => r.protein >= goalProt * 0.85),
      carbs: calcStreak(today, dailyMap, (r) => r.carbs >= goalCarbs * 0.8 && r.carbs <= goalCarbs * 1.15),
      fat: calcStreak(today, dailyMap, (r) => r.fat >= goalFat * 0.8 && r.fat <= goalFat * 1.15),
    });
  } catch {
    return NextResponse.json({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  }
}
