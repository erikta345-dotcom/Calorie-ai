import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.execute({ sql: "DELETE FROM FoodEntry WHERE id = ?", args: [params.id] });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  }
}
