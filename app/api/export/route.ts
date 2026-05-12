import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function userId(session: any) {
  return (session?.user as any)?.id as string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = userId(session);
  if (!(await checkRateLimit(`export:${uid}`, 5, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  }

  const result = await db.execute({
    sql: "SELECT date, meal, name, calories, protein, carbs, fat, grams, source, note FROM FoodEntry WHERE userId = ? ORDER BY date ASC, createdAt ASC",
    args: [uid],
  });

  const header = "fecha,comida,nombre,calorias,proteina,carbohidratos,grasa,gramos,fuente,nota\n";
  const rows = result.rows
    .map((r) =>
      [r.date, r.meal, `"${String(r.name ?? "").replace(/"/g, '""')}"`, r.calories, r.protein, r.carbs, r.fat, r.grams, r.source, `"${String(r.note ?? "").replace(/"/g, '""')}"`].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="calorie-ai-export.csv"`,
    },
  });
}
