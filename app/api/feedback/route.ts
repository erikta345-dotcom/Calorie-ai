import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const uid = session ? (session.user as any).id as string : null;
  const isAdmin = !!(session?.user?.email && process.env.ADMIN_EMAIL && session.user.email === process.env.ADMIN_EMAIL);
  const result = await db.execute({
    sql: `SELECT f.id, f.author, f.message, f.stars, f.createdAt, f.userId, f.reply, f.resolved,
      (SELECT COUNT(*) FROM FeedbackLike WHERE feedbackId = f.id) AS likes,
      (SELECT COUNT(*) FROM FeedbackLike WHERE feedbackId = f.id AND userId = ?) AS userLiked,
      CASE WHEN f.userId = ? THEN 1 ELSE 0 END AS isOwner
    FROM Feedback f ORDER BY f.createdAt DESC`,
    args: [uid ?? "", uid ?? ""],
  });
  return NextResponse.json({ items: result.rows, isAdmin });
}

export async function POST(req: NextRequest) {
  const { uid, session, error } = await requireAuth("feedback", 10);
  if (error) return error;
  const { message, stars } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 400 });
  const id = crypto.randomUUID();
  const author = session.user?.name || "Anónimo";
  const rating = Math.min(5, Math.max(0.5, Math.round((parseFloat(stars) || 5) * 2) / 2));
  await db.execute({
    sql: "INSERT INTO Feedback (id, userId, author, message, stars) VALUES (?, ?, ?, ?, ?)",
    args: [id, uid, author, message.trim(), rating],
  });
  return NextResponse.json({ ok: true });
}
