import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const VALID_GENDERS = ["male", "female", "other"];
const VALID_GOALS = ["lose_fat", "maintain", "gain_muscle"];

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`settings-get:${uid}`, 30, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
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
  if (!(await checkRateLimit(`settings-put:${uid}`, 10, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
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
    await db.execute({
      sql: `INSERT INTO UserSettings (id, weight, height, age, gender, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              weight=COALESCE(excluded.weight, weight),
              height=COALESCE(excluded.height, height),
              age=COALESCE(excluded.age, age),
              gender=COALESCE(excluded.gender, gender),
              goal=COALESCE(excluded.goal, goal),
              goalCalories=COALESCE(excluded.goalCalories, goalCalories),
              goalProtein=COALESCE(excluded.goalProtein, goalProtein),
              goalCarbs=COALESCE(excluded.goalCarbs, goalCarbs),
              goalFat=COALESCE(excluded.goalFat, goalFat),
              mealTimes=COALESCE(excluded.mealTimes, mealTimes)`,
      args: [uid, weight ?? null, height ?? null, age ?? null, gender ?? null, goal ?? null, goalCalories ?? null, goalProtein ?? null, goalCarbs ?? null, goalFat ?? null, mealTimes ? JSON.stringify(mealTimes) : null],
    });
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = ?", args: [uid] });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
