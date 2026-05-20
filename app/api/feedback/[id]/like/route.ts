import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { uid, error } = await requireAuth("like", 30);
  if (error) return error;

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
