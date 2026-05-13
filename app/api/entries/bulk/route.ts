import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { VALID_MEALS, VALID_SOURCES, DATE_RE } from "@/lib/constants";

function userId(session: any) {
  return (session?.user as any)?.id as string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  if (!(await checkRateLimit(`entries:${uid}`, 60, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  }
  try {
    const { entries } = await req.json();
    if (!Array.isArray(entries) || entries.length === 0 || entries.length > 100) {
      return NextResponse.json({ error: "Entradas inválidas" }, { status: 400 });
    }
    const created = [];
    for (const e of entries) {
      const { date, meal, name, calories, protein, carbs, fat, grams, source, note } = e;
      if (!date || !meal || !name || calories == null) continue;
      if (!DATE_RE.test(date) || !VALID_MEALS.includes(meal)) continue;
      if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) continue;
      const cal = parseFloat(calories);
      if (isNaN(cal) || cal < 0 || cal > 10000) continue;
      const src = VALID_SOURCES.includes(source) ? source : "manual";
      const noteVal = typeof note === "string" && note.trim().length > 0 ? note.trim().slice(0, 300) : null;
      const id = randomUUID();
      const ts = new Date().toISOString();
      await db.execute({
        sql: "INSERT INTO FoodEntry (id, userId, date, meal, name, calories, protein, carbs, fat, grams, source, createdAt, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [id, uid, date, meal, name.trim(), cal, Math.max(0, parseFloat(protein) || 0), Math.max(0, parseFloat(carbs) || 0), Math.max(0, parseFloat(fat) || 0), Math.max(1, parseFloat(grams) || 100), src, ts, noteVal],
      });
      const row = await db.execute({ sql: "SELECT * FROM FoodEntry WHERE id = ?", args: [id] });
      if (row.rows[0]) created.push(row.rows[0]);
    }
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Error al crear entradas" }, { status: 500 });
  }
}
