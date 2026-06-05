import { NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { getUserTier } from "@/lib/subscription";
import { db } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;

  const tier = await getUserTier(uid);

  let hasStripe = false;
  try {
    const result = await db.execute({
      sql: "SELECT stripeCustomerId FROM UserSettings WHERE id = ?",
      args: [uid],
    });
    hasStripe = !!(result.rows[0]?.stripeCustomerId && stripe);
  } catch {}

  return NextResponse.json({ tier, hasStripe });
}
