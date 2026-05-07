import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`alerts:${uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  const { enabled } = await req.json();
  await db.execute({
    sql: "UPDATE CustomAlert SET enabled = ? WHERE id = ? AND userId = ?",
    args: [enabled ? 1 : 0, params.id, uid],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`alerts:${uid}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  await db.execute({
    sql: "DELETE FROM CustomAlert WHERE id = ? AND userId = ?",
    args: [params.id, uid],
  });
  return NextResponse.json({ ok: true });
}
