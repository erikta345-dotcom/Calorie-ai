import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
  const { type, label, time, threshold } = await req.json();
  if (!type || !label) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (type === "time" && !time) return NextResponse.json({ error: "Time required" }, { status: 400 });
  if (type === "calorie" && !threshold) return NextResponse.json({ error: "Threshold required" }, { status: 400 });
  const id = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO CustomAlert (id, userId, type, label, time, threshold) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, uid, type, label, time ?? null, threshold ?? null],
  });
  const result = await db.execute({ sql: "SELECT * FROM CustomAlert WHERE id = ?", args: [id] });
  return NextResponse.json(result.rows[0], { status: 201 });
}
