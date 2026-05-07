import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS WeightLog (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL NOT NULL
    )
  `).catch(() => {});
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  await ensureTable();
  const result = await db.execute({
    sql: "SELECT date, weight FROM WeightLog WHERE userId = ? ORDER BY date ASC LIMIT 90",
    args: [uid],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  const { date, weight } = await req.json();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  const w = parseFloat(weight);
  if (isNaN(w) || w < 20 || w > 500) return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
  await ensureTable();
  const id = `${uid}_${date}`;
  await db.execute({
    sql: "INSERT INTO WeightLog (id, userId, date, weight) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET weight=excluded.weight",
    args: [id, uid, date, w],
  });
  return NextResponse.json({ date, weight: w });
}
