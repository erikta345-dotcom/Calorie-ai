import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { uid, error } = await requireAuth("alerts", 20);
  if (error) return error;
  const { enabled } = await req.json();
  await db.execute({
    sql: "UPDATE CustomAlert SET enabled = ? WHERE id = ? AND userId = ?",
    args: [enabled ? 1 : 0, params.id, uid],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { uid, error } = await requireAuth("alerts", 20);
  if (error) return error;
  await db.execute({
    sql: "DELETE FROM CustomAlert WHERE id = ? AND userId = ?",
    args: [params.id, uid],
  });
  return NextResponse.json({ ok: true });
}
