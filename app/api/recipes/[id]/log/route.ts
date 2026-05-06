import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  try {
    const { meal, date } = await req.json();
    if (!meal || !date) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

    const result = await db.execute({
      sql: "SELECT * FROM Recipe WHERE id = ? AND userId = ?",
      args: [params.id, userId],
    });
    if (!result.rows.length) return NextResponse.json({ error: "Receta no encontrada" }, { status: 404 });

    const recipe = result.rows[0] as any;
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO FoodEntry (id, userId, date, meal, name, calories, protein, carbs, fat, grams, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, date, meal, recipe.name, recipe.totalCalories, recipe.totalProtein, recipe.totalCarbs, recipe.totalFat, 100, "recipe"],
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al registrar receta" }, { status: 500 });
  }
}
