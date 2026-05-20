import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, requireAuthOnly } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { uid, session, error } = await requireAuth("feedback", 20);
  if (error) return error;
  const isAdmin = session.user?.email === process.env.ADMIN_EMAIL;
  if (isAdmin) {
    await db.execute({ sql: "DELETE FROM Feedback WHERE id = ?", args: [params.id] });
  } else {
    await db.execute({ sql: "DELETE FROM Feedback WHERE id = ? AND userId = ?", args: [params.id, uid] });
  }
  await db.execute({ sql: "DELETE FROM FeedbackLike WHERE feedbackId = ?", args: [params.id] });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await requireAuthOnly();
  if (error) return error;
  if (session.user?.email !== process.env.ADMIN_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { reply, resolved } = await req.json();
  if (reply != null && (typeof reply !== "string" || reply.length > 500)) {
    return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 });
  }
  await db.execute({
    sql: "UPDATE Feedback SET reply = COALESCE(?, reply), resolved = COALESCE(?, resolved) WHERE id = ?",
    args: [reply ?? null, resolved !== undefined ? (resolved ? 1 : 0) : null, params.id],
  });
  return NextResponse.json({ ok: true });
}
