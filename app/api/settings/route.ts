import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  try {
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
    if (result.rows.length === 0) {
      await db.execute({ sql: "INSERT INTO UserSettings (id) VALUES (?)", args: [uid] });
      const created = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
      return NextResponse.json(created.rows[0]);
    }
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  try {
    const { weight, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes } = await req.json();
    await db.execute({
      sql: "INSERT INTO UserSettings (id, weight, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET weight=excluded.weight, goalCalories=excluded.goalCalories, goalProtein=excluded.goalProtein, goalCarbs=excluded.goalCarbs, goalFat=excluded.goalFat, mealTimes=excluded.mealTimes",
      args: [uid, weight, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes ? JSON.stringify(mealTimes) : null],
    });
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
