import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  if (!(await checkRateLimit(`recipes:${userId}`, 20, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  try {
    const result = await db.execute({ sql: "DELETE FROM Recipe WHERE id = ? AND userId = ?", args: [params.id, userId] });
    if (!result.rowsAffected) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
