import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DATE_RE } from "@/lib/constants";

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function calcStreak(
  today: string,
  dailyMap: Map<string, { cal: number; protein: number; carbs: number; fat: number }>,
  check: (row: { cal: number; protein: number; carbs: number; fat: number }) => boolean
): number {
  const todayDate = new Date(`${today}T00:00:00`);
  const yesterStr = fmtDate(new Date(todayDate.getTime() - 86400000));

  const todayRow = dailyMap.get(today);
  const yesterRow = dailyMap.get(yesterStr);

  let cur: Date | null = todayRow && check(todayRow)
    ? todayDate
    : yesterRow && check(yesterRow)
    ? new Date(todayDate.getTime() - 86400000)
    : null;

  let streak = 0;
  while (cur) {
    const key = fmtDate(cur);
    const row = dailyMap.get(key);
    if (row && check(row)) {
      streak++;
      cur = new Date(cur.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ calories: 0, protein: 0, carbs: 0, fat: 0 }, { status: 401 });
  const uid = (session.user as any).id as string;

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
