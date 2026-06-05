import { NextRequest, NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { stripe, PRICE_IDS } from "@/lib/stripe";
import { db } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });

  const { uid, session, error } = await requireAuthOnly();
  if (error) return error;

  const { plan } = await req.json();
  const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
  if (!priceId) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const result = await db.execute({
    sql: "SELECT stripeCustomerId, email FROM UserSettings WHERE id = ?",
    args: [uid],
  });

  let customerId = result.rows[0]?.stripeCustomerId as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: (session.user as any)?.email ?? undefined,
      metadata: { uid },
    });
    customerId = customer.id;
    await db.execute({
      sql: "UPDATE UserSettings SET stripeCustomerId = ? WHERE id = ?",
      args: [customerId, uid],
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/settings?upgraded=1`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    subscription_data: { metadata: { uid, plan } },
  });

  return NextResponse.json({ url: checkout.url });
}
