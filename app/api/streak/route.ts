import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ streak: 0 }, { status: 401 });
  const uid = (session.user as any).id as string;

  const today = req.nextUrl.searchParams.get("date") ?? "";
  if (!DATE_RE.test(today)) return NextResponse.json({ streak: 0 }, { status: 400 });

  try {
    const result = await db.execute({
      sql: "SELECT DISTINCT date FROM FoodEntry WHERE userId = ? AND date >= date(?, '-730 days') ORDER BY date DESC",
      args: [uid, today],
    });
    const dates = new Set(result.rows.map((r) => r.date as string));

    const parseDate = (s: string) => new Date(`${s}T00:00:00`);
    const fmtDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const todayDate = parseDate(today);
    const yesterStr = fmtDate(new Date(todayDate.getTime() - 86400000));

    let streak = 0;
    let cur: Date | null = dates.has(today)
      ? todayDate
      : dates.has(yesterStr)
      ? new Date(todayDate.getTime() - 86400000)
      : null;

    while (cur && dates.has(fmtDate(cur))) {
      streak++;
      cur = new Date(cur.getTime() - 86400000);
    }

    return NextResponse.json({ streak });
  } catch {
    return NextResponse.json({ streak: 0 });
  }
}
