import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { OWNER_EMAIL } from "@/lib/subscription";
import { db } from "@/lib/prisma";
import { randomBytes } from "crypto";

async function assertOwner(uid: string): Promise<boolean> {
  if (uid === OWNER_EMAIL) return true;
  const result = await db.execute({
    sql: "SELECT email FROM UserSettings WHERE id = ?",
    args: [uid],
  }).catch(() => ({ rows: [] }));
  return (result.rows[0]?.email as string) === OWNER_EMAIL;
}

export async function GET() {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;
  if (!(await assertOwner(uid))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const codes = await db.execute({
    sql: "SELECT * FROM PromoCodes ORDER BY createdAt DESC",
    args: [],
  });
  return NextResponse.json(codes.rows);
}

export async function POST(req: NextRequest) {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;
  if (!(await assertOwner(uid))) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const tier = body.tier === "elite" ? "elite" : "pro";
  const maxUses = Math.max(1, parseInt(body.maxUses) || 1);
  const tierExpiresAt = body.tierExpiresAt ?? null;
  const code = randomBytes(4).toString("hex").toUpperCase();

  await db.execute({
    sql: "INSERT INTO PromoCodes (code, tier, maxUses, uses, tierExpiresAt) VALUES (?, ?, ?, 0, ?)",
    args: [code, tier, maxUses, tierExpiresAt],
  });

  return NextResponse.json({ code, tier, maxUses });
}
