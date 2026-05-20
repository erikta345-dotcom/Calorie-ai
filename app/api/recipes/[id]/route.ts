import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { uid: userId, error } = await requireAuth("recipes", 20);
  if (error) return error;
  try {
    const result = await db.execute({ sql: "DELETE FROM Recipe WHERE id = ? AND userId = ?", args: [params.id, userId] });
    if (!result.rowsAffected) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
