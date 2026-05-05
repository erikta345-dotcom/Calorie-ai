import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ensureColumns() {
  await db.execute("ALTER TABLE UserSettings ADD COLUMN height REAL DEFAULT 175").catch(() => {});
  await db.execute("ALTER TABLE UserSettings ADD COLUMN goal TEXT DEFAULT 'maintain'").catch(() => {});
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  try {
    await ensureColumns();
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
    const { weight, height, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes } = await req.json();
    await ensureColumns();
    await db.execute({
      sql: `INSERT INTO UserSettings (id, weight, height, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              weight=excluded.weight, height=excluded.height, goal=excluded.goal,
              goalCalories=excluded.goalCalories, goalProtein=excluded.goalProtein,
              goalCarbs=excluded.goalCarbs, goalFat=excluded.goalFat, mealTimes=excluded.mealTimes`,
      args: [uid, weight, height ?? 175, goal ?? "maintain", goalCalories, goalProtein, goalCarbs, goalFat, mealTimes ? JSON.stringify(mealTimes) : null],
    });
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
