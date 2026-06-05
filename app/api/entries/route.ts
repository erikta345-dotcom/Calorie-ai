import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/api-auth";
import { VALID_MEALS, VALID_SOURCES, DATE_RE } from "@/lib/constants";
import { getUserTier, maxHistoryDays } from "@/lib/subscription";
import { subDays, format } from "date-fns";

export async function GET(req: NextRequest) {
  const { uid, error } = await requireAuth("entries-get", 60);
  if (error) return error;
  const date = req.nextUrl.searchParams.get("date");
  let from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (date && !DATE_RE.test(date)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  try {
    // Enforce history limit based on tier
    if (from) {
      const tier = await getUserTier(uid);
      const limit = maxHistoryDays(tier);
      const minAllowed = format(subDays(new Date(), limit - 1), "yyyy-MM-dd");
      if (from < minAllowed) from = minAllowed;
    }

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
  const { uid, error } = await requireAuth("entries", 60);
  if (error) return error;
  try {
    const { date, meal, name, calories, protein, carbs, fat, grams, source, createdAt, note } = await req.json();
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
    const ts = typeof createdAt === "string" && createdAt.length > 0 ? createdAt : new Date().toISOString();
    const noteVal = typeof note === "string" && note.trim().length > 0 ? note.trim().slice(0, 300) : null;
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO FoodEntry (id, userId, date, meal, name, calories, protein, carbs, fat, grams, source, createdAt, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, uid, date, meal, name.trim(), cal, Math.max(0, parseFloat(protein) || 0), Math.max(0, parseFloat(carbs) || 0), Math.max(0, parseFloat(fat) || 0), Math.max(1, parseFloat(grams) || 100), src, ts, noteVal],
    });
    const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ? AND userId = ?", args: [id, uid] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear entrada" }, { status: 500 });
  }
}
