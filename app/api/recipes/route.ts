import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { requireAuth, requireAuthOnly } from "@/lib/api-auth";

export async function GET() {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;
  try {
    const result = await db.execute({
      sql: "SELECT * FROM Recipe WHERE userId = ? ORDER BY createdAt DESC",
      args: [uid],
    });
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      items: JSON.parse(r.items as string),
      totalCalories: r.totalCalories,
      totalProtein: r.totalProtein,
      totalCarbs: r.totalCarbs,
      totalFat: r.totalFat,
      createdAt: r.createdAt,
    }));
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Error al obtener recetas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { uid: userId, error } = await requireAuth("recipes", 20);
  if (error) return error;
  try {
    const { name, items, totalCalories, totalProtein, totalCarbs, totalFat } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
    }
    const invalidItem = items.some((item: any) =>
      !item.name || typeof item.name !== "string" || item.name.length > 100 ||
      typeof item.calories !== "number" || item.calories < 0 || item.calories > 5000 ||
      typeof item.protein !== "number" || item.protein < 0 || item.protein > 500 ||
      typeof item.carbs !== "number" || item.carbs < 0 || item.carbs > 500 ||
      typeof item.fat !== "number" || item.fat < 0 || item.fat > 500
    );
    if (invalidItem) return NextResponse.json({ error: "Item inválido" }, { status: 400 });
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO Recipe (id, userId, name, items, totalCalories, totalProtein, totalCarbs, totalFat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, name.trim(), JSON.stringify(items), totalCalories ?? 0, totalProtein ?? 0, totalCarbs ?? 0, totalFat ?? 0],
    });
    const row = await db.execute({ sql: "SELECT * FROM Recipe WHERE id = ?", args: [id] });
    const r = row.rows[0] as any;
    return NextResponse.json({
      id: r.id,
      userId: r.userId,
      name: r.name,
      items: JSON.parse(r.items as string),
      totalCalories: r.totalCalories,
      totalProtein: r.totalProtein,
      totalCarbs: r.totalCarbs,
      totalFat: r.totalFat,
      createdAt: r.createdAt,
    }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear receta" }, { status: 500 });
  }
}
