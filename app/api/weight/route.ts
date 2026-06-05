import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { DATE_RE } from "@/lib/constants";
import { getUserTier, tierGte } from "@/lib/subscription";

export async function GET() {
  const { uid, error } = await requireAuth("weight-get", 30);
  if (error) return error;
  if (!tierGte(await getUserTier(uid), "elite")) {
    return NextResponse.json({ error: "Seguimiento de peso requiere plan Elite.", upgradeRequired: true }, { status: 403 });
  }
  const result = await db.execute({
    sql: "SELECT date, weight FROM WeightLog WHERE userId = ? ORDER BY date ASC LIMIT 90",
    args: [uid],
  });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { uid, error } = await requireAuth("weight-post", 10);
  if (error) return error;
  const { date, weight } = await req.json();
  if (!date || !DATE_RE.test(date)) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  const w = parseFloat(weight);
  if (isNaN(w) || w < 20 || w > 500) return NextResponse.json({ error: "Peso inválido" }, { status: 400 });
  const id = `${uid}_${date}`;
  await db.execute({
    sql: "INSERT INTO WeightLog (id, userId, date, weight) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET weight=excluded.weight",
    args: [id, uid, date, w],
  });
  return NextResponse.json({ date, weight: w });
}
