import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = 'default'", args: [] });
    if (result.rows.length === 0) {
      await db.execute({ sql: "INSERT INTO UserSettings (id) VALUES ('default')", args: [] });
      const created = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = 'default'", args: [] });
      return NextResponse.json(created.rows[0]);
    }
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { weight, goalCalories, goalProtein, goalCarbs, goalFat } = await req.json();
    await db.execute({
      sql: "INSERT INTO UserSettings (id, weight, goalCalories, goalProtein, goalCarbs, goalFat) VALUES ('default', ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET weight=excluded.weight, goalCalories=excluded.goalCalories, goalProtein=excluded.goalProtein, goalCarbs=excluded.goalCarbs, goalFat=excluded.goalFat",
      args: [weight, goalCalories, goalProtein, goalCarbs, goalFat],
    });
    const result = await db.execute({ sql: "SELECT * FROM UserSettings WHERE id = 'default'", args: [] });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
