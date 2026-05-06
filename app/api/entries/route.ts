import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const VALID_MEALS = ["desayuno", "comida", "merienda", "cena", "snack"];
const VALID_SOURCES = ["manual", "search", "scan", "barcode", "recipe"];

function userId(session: any) {
  return (session?.user as any)?.id as string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  const date = req.nextUrl.searchParams.get("date");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  try {
    let result;
    if (from && to) {
      result = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE userId = ? AND date >= ? AND date <= ? ORDER BY date ASC, createdAt ASC", args: [uid, from, to] });
    } else if (date) {
      result = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE userId = ? AND date = ? ORDER BY createdAt ASC", args: [uid, date] });
    } else {
      result = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE userId = ? ORDER BY createdAt ASC", args: [uid] });
    }
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Error al obtener entradas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  if (!(await checkRateLimit(`entries:${uid}`, 60, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }
  try {
    const { date, meal, name, calories, protein, carbs, fat, grams, source } = await req.json();
    if (!date || !meal || !name || calories == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Formato de fecha inválido" }, { status: 400 });
    }
    if (!VALID_MEALS.includes(meal)) {
      return NextResponse.json({ error: "Comida inválida" }, { status: 400 });
    }
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    const cal = parseFloat(calories);
    if (isNaN(cal) || cal < 0 || cal > 10000) {
      return NextResponse.json({ error: "Calorías fuera de rango" }, { status: 400 });
    }
    const src = source ?? "manual";
    if (!VALID_SOURCES.includes(src)) {
      return NextResponse.json({ error: "Fuente inválida" }, { status: 400 });
    }
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO FoodEntry (id, userId, date, meal, name, calories, protein, carbs, fat, grams, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, uid, date, meal, name.trim(), cal, Math.max(0, parseFloat(protein) || 0), Math.max(0, parseFloat(carbs) || 0), Math.max(0, parseFloat(fat) || 0), Math.max(1, parseFloat(grams) || 100), src],
    });
    const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ?", args: [id] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear entrada" }, { status: 500 });
  }
}
