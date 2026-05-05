import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Feedback (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
}

export async function GET() {
  await ensureTable();
  const result = await db.execute("SELECT * FROM Feedback ORDER BY createdAt DESC");
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const id = crypto.randomUUID();
  const author = session.user?.name || "Anónimo";
  await db.execute({
    sql: "INSERT INTO Feedback (id, author, message) VALUES (?, ?, ?)",
    args: [id, author, message.trim()],
  });
  return NextResponse.json({ ok: true });
}
