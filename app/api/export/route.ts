import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

function csvCell(value: string | null | undefined): string {
  const s = String(value ?? "");
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_req: NextRequest) {
  const { uid, error } = await requireAuth("export", 5);
  if (error) return error;

  const result = await db.execute({
    sql: "SELECT date, meal, name, calories, protein, carbs, fat, grams, source, note FROM FoodEntry WHERE userId = ? ORDER BY date ASC, createdAt ASC",
    args: [uid],
  });

  const header = "fecha,comida,nombre,calorias,proteina,carbohidratos,grasa,gramos,fuente,nota\n";
  const rows = result.rows
    .map((r) =>
      [r.date, r.meal, csvCell(r.name as string), r.calories, r.protein, r.carbs, r.fat, r.grams, r.source, csvCell(r.note as string)].join(",")
    )
    .join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutrisnap-export.csv"`,
    },
  });
}
