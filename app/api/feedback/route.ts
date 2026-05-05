import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function ensureTables() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Feedback (
      id TEXT PRIMARY KEY,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      stars INTEGER DEFAULT 5,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute("ALTER TABLE Feedback ADD COLUMN stars INTEGER DEFAULT 5").catch(() => {});
  await db.execute(`
    CREATE TABLE IF NOT EXISTS FeedbackLike (
      id TEXT PRIMARY KEY,
      feedbackId TEXT NOT NULL,
      userId TEXT NOT NULL,
      UNIQUE(feedbackId, userId)
    )
  `);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const uid = session ? (session.user as any).id as string : null;
  await ensureTables();
  const result = await db.execute(`
    SELECT f.*,
      (SELECT COUNT(*) FROM FeedbackLike WHERE feedbackId = f.id) AS likes,
      ${uid ? `(SELECT COUNT(*) FROM FeedbackLike WHERE feedbackId = f.id AND userId = '${uid}')` : "0"} AS userLiked
    FROM Feedback f ORDER BY f.createdAt DESC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTables();
  const { message, stars } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const id = crypto.randomUUID();
  const author = session.user?.name || "Anónimo";
  const rating = Math.min(5, Math.max(1, parseInt(stars) || 5));
  await db.execute({
    sql: "INSERT INTO Feedback (id, author, message, stars) VALUES (?, ?, ?, ?)",
    args: [id, author, message.trim(), rating],
  });
  return NextResponse.json({ ok: true });
}
