import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  try {
    const { date, meal, name, calories, protein, carbs, fat, grams, source } = await req.json();
    if (!date || !meal || !name || calories == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO FoodEntry (id, userId, date, meal, name, calories, protein, carbs, fat, grams, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, uid, date, meal, name, parseFloat(calories), parseFloat(protein ?? 0), parseFloat(carbs ?? 0), parseFloat(fat ?? 0), parseFloat(grams ?? 100), source ?? "manual"],
    });
    const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ?", args: [id] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear entrada" }, { status: 500 });
  }
}
