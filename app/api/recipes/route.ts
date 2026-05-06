import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function uid(session: any) {
  return (session?.user as any)?.id as string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await db.execute({
      sql: "SELECT * FROM Recipe WHERE userId = ? ORDER BY createdAt DESC",
      args: [uid(session)],
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name, items, totalCalories, totalProtein, totalCarbs, totalFat } = await req.json();
    if (!name || !items?.length) return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO Recipe (id, userId, name, items, totalCalories, totalProtein, totalCarbs, totalFat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, uid(session), name, JSON.stringify(items), totalCalories ?? 0, totalProtein ?? 0, totalCarbs ?? 0, totalFat ?? 0],
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
