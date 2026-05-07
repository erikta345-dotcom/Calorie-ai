import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`like:${uid}`, 30, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });

  const existing = await db.execute({
    sql: "SELECT id FROM FeedbackLike WHERE feedbackId = ? AND userId = ?",
    args: [params.id, uid],
  });

  if (existing.rows.length > 0) {
    await db.execute({
      sql: "DELETE FROM FeedbackLike WHERE feedbackId = ? AND userId = ?",
      args: [params.id, uid],
    });
    return NextResponse.json({ liked: false });
  }

  await db.execute({
    sql: "INSERT INTO FeedbackLike (id, feedbackId, userId) VALUES (?, ?, ?)",
    args: [crypto.randomUUID(), params.id, uid],
  });
  return NextResponse.json({ liked: true });
}
