import { NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";

export async function POST() {
  if (!stripe) return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });

  const { uid, error } = await requireAuthOnly();
  if (error) return error;

  const result = await db.execute({
    sql: "SELECT stripeCustomerId FROM UserSettings WHERE id = ?",
    args: [uid],
  });
  const customerId = result.rows[0]?.stripeCustomerId as string | null;
  if (!customerId) return NextResponse.json({ error: "Sin suscripción activa" }, { status: 404 });

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
