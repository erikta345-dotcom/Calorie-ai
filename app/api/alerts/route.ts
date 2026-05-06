import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

const VALID_TYPES = ["time", "calorie"];

export const dynamic = "force-dynamic";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS CustomAlert (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      time TEXT,
      threshold REAL,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  await ensureTable();
  const result = await db.execute({
    sql: "SELECT * FROM CustomAlert WHERE userId = ? ORDER BY createdAt DESC",
    args: [uid],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  await ensureTable();
  if (!(await checkRateLimit(`alerts:${uid}`, 20, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }
  const { type, label, time, threshold } = await req.json();
  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  if (!label || typeof label !== "string" || label.trim().length === 0 || label.length > 100) {
    return NextResponse.json({ error: "Etiqueta inválida" }, { status: 400 });
  }
  if (type === "time") {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Formato de hora inválido (HH:MM)" }, { status: 400 });
    }
  }
  if (type === "calorie") {
    const t = parseFloat(threshold);
    if (isNaN(t) || t <= 0 || t > 10000) {
      return NextResponse.json({ error: "Umbral inválido" }, { status: 400 });
    }
  }
  const id = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO CustomAlert (id, userId, type, label, time, threshold) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, uid, type, label, time ?? null, threshold ?? null],
  });
  const result = await db.execute({ sql: "SELECT * FROM CustomAlert WHERE id = ?", args: [id] });
  return NextResponse.json(result.rows[0], { status: 201 });
}
