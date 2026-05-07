import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`feedback:${uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  await db.execute({
    sql: "DELETE FROM Feedback WHERE id = ? AND userId = ?",
    args: [params.id, uid],
  });
  await db.execute({
    sql: "DELETE FROM FeedbackLike WHERE feedbackId = ?",
    args: [params.id],
  });
  return NextResponse.json({ ok: true });
}
