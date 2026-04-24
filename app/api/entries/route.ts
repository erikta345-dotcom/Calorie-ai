import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  try {
    const result = date
      ? await db.execute({ sql: "SELECT * FROM FoodEntry WHERE date = ? ORDER BY createdAt ASC", args: [date] })
      : await db.execute("SELECT * FROM FoodEntry ORDER BY createdAt ASC");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Error al obtener entradas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { date, meal, name, calories, protein, carbs, fat, grams, source } = await req.json();

    if (!date || !meal || !name || calories == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO FoodEntry (id, date, meal, name, calories, protein, carbs, fat, grams, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, date, meal, name, parseFloat(calories), parseFloat(protein ?? 0), parseFloat(carbs ?? 0), parseFloat(fat ?? 0), parseFloat(grams ?? 100), source ?? "manual"],
    });

    const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ?", args: [id] });
    return NextResponse.json(row.rows[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear entrada" }, { status: 500 });
  }
}
