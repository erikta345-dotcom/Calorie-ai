import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VALID_GENDERS = ["male", "female", "other"];
const VALID_GOALS = ["lose", "maintain", "gain"];

export const dynamic = "force-dynamic";

async function ensureColumns() {
  await db.execute("ALTER TABLE UserSettings ADD COLUMN height REAL DEFAULT 175").catch(() => {});
  await db.execute("ALTER TABLE UserSettings ADD COLUMN age INTEGER DEFAULT 25").catch(() => {});
  await db.execute("ALTER TABLE UserSettings ADD COLUMN gender TEXT DEFAULT 'male'").catch(() => {});
  await db.execute("ALTER TABLE UserSettings ADD COLUMN goal TEXT DEFAULT 'maintain'").catch(() => {});
  await db.execute("ALTER TABLE UserSettings ADD COLUMN mealTimes TEXT").catch(() => {});
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
    const { weight, height, age, gender, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes } = await req.json();
    if (weight != null && (isNaN(parseFloat(weight)) || parseFloat(weight) < 20 || parseFloat(weight) > 500)) {
      return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
    }
    if (height != null && (isNaN(parseFloat(height)) || parseFloat(height) < 50 || parseFloat(height) > 300)) {
      return NextResponse.json({ error: "Altura inválida" }, { status: 400 });
    }
    if (age != null && (isNaN(parseInt(age)) || parseInt(age) < 10 || parseInt(age) > 120)) {
      return NextResponse.json({ error: "Edad inválida" }, { status: 400 });
    }
    if (gender != null && !VALID_GENDERS.includes(gender)) {
      return NextResponse.json({ error: "Género inválido" }, { status: 400 });
    }
    if (goal != null && !VALID_GOALS.includes(goal)) {
      return NextResponse.json({ error: "Objetivo inválido" }, { status: 400 });
    }
    const macroFields = [goalCalories, goalProtein, goalCarbs, goalFat];
    if (macroFields.some((v) => v != null && (isNaN(parseFloat(v)) || parseFloat(v) < 0 || parseFloat(v) > 10000))) {
      return NextResponse.json({ error: "Macros inválidos" }, { status: 400 });
    }
    await ensureColumns();
    await db.execute({
      sql: `INSERT INTO UserSettings (id, weight, height, age, gender, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              weight=excluded.weight, height=excluded.height, age=excluded.age, gender=excluded.gender,
              goal=excluded.goal, goalCalories=excluded.goalCalories, goalProtein=excluded.goalProtein,
              goalCarbs=excluded.goalCarbs, goalFat=excluded.goalFat, mealTimes=excluded.mealTimes`,
      args: [uid, weight, height ?? 175, age ?? 25, gender ?? "male", goal ?? "maintain", goalCalories, goalProtein, goalCarbs, goalFat, mealTimes ? JSON.stringify(mealTimes) : null],
    });
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
