import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";
import { syncStripeSubscriptionForUser } from "@/lib/stripe-subscription-sync";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

async function userIdForSubscription(sub: Stripe.Subscription): Promise<string | null> {
  if (sub.metadata.uid) return sub.metadata.uid;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const result = await db.execute({
    sql: "SELECT id FROM UserSettings WHERE stripeCustomerId = ?",
    args: [customerId],
  });
  return (result.rows[0]?.id as string | undefined) ?? null;
}

export async function POST(req: NextRequest) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription") return NextResponse.json({ ok: true });
    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
    const uid = await userIdForSubscription(sub);
    if (uid) await syncStripeSubscriptionForUser(uid);
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const uid = await userIdForSubscription(sub);
    if (uid) await syncStripeSubscriptionForUser(uid);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const uid = await userIdForSubscription(sub);
    if (uid) await syncStripeSubscriptionForUser(uid);
  }

  return NextResponse.json({ ok: true });
}
