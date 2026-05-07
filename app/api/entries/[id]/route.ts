import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VALID_MEALS = ["desayuno", "comida", "merienda", "cena", "snack", "picoteo"];

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  try {
    const result = await db.execute({ sql: "DELETE FROM FoodEntry WHERE id = ? AND userId = ?", args: [params.id, uid] });
    if (!result.rowsAffected) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  try {
    const { name, calories, protein, carbs, fat, grams, meal } = await req.json();
    if (meal && !VALID_MEALS.includes(meal)) return NextResponse.json({ error: "Comida inválida" }, { status: 400 });
    const cal = parseFloat(calories);
    if (isNaN(cal) || cal < 0 || cal > 10000) return NextResponse.json({ error: "Calorías inválidas" }, { status: 400 });
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    await db.execute({
      sql: "UPDATE FoodEntry SET name=?, calories=?, protein=?, carbs=?, fat=?, grams=?, meal=? WHERE id=? AND userId=?",
      args: [name.trim(), cal, Math.max(0, parseFloat(protein) || 0), Math.max(0, parseFloat(carbs) || 0), Math.max(0, parseFloat(fat) || 0), Math.max(1, parseFloat(grams) || 100), meal, params.id, uid],
    });
    const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ? AND userId = ?", args: [params.id, uid] });
    if (!row.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(row.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al editar" }, { status: 500 });
  }
}
