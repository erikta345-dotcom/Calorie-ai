import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { db } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;

  const { code } = await req.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const normalized = code.trim().toUpperCase();

  const result = await db.execute({
    sql: "SELECT * FROM PromoCodes WHERE code = ?",
    args: [normalized],
  });

  if (!result.rows.length) return NextResponse.json({ error: "Código no válido" }, { status: 404 });
  const promo = result.rows[0];

  if (promo.expiresAt && new Date(promo.expiresAt as string) < new Date()) {
    return NextResponse.json({ error: "Código expirado" }, { status: 410 });
  }

  if ((promo.maxUses as number) > 0 && (promo.uses as number) >= (promo.maxUses as number)) {
    return NextResponse.json({ error: "Código agotado" }, { status: 410 });
  }

  await db.execute({
    sql: "UPDATE UserSettings SET tier = ?, tierExpiresAt = ?, stripeSubscriptionId = NULL WHERE id = ?",
    args: [promo.tier, (promo.tierExpiresAt as string) ?? null, uid],
  });

  await db.execute({
    sql: "UPDATE PromoCodes SET uses = uses + 1 WHERE code = ?",
    args: [normalized],
  });

  return NextResponse.json({ tier: promo.tier });
}
