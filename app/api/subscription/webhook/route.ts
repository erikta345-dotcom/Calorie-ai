import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/prisma";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

function planToTier(plan: string): string {
  if (plan.includes("elite")) return "elite";
  if (plan.includes("pro")) return "pro";
  return "free";
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
    const uid = sub.metadata.uid;
    const plan = sub.metadata.plan ?? "";
    if (uid) {
      await db.execute({
        sql: "UPDATE UserSettings SET tier = ?, stripeSubscriptionId = ?, tierExpiresAt = NULL WHERE id = ?",
        args: [planToTier(plan), sub.id, uid],
      });
    }
  }

  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const uid = sub.metadata.uid;
    const plan = sub.metadata.plan ?? "";
    if (uid) {
      const tier = sub.status === "active" || sub.status === "trialing" ? planToTier(plan) : "free";
      await db.execute({
        sql: "UPDATE UserSettings SET tier = ?, stripeSubscriptionId = ?, tierExpiresAt = NULL WHERE id = ?",
        args: [tier, sub.id, uid],
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const uid = sub.metadata.uid;
    if (uid) {
      await db.execute({
        sql: "UPDATE UserSettings SET tier = 'free', stripeSubscriptionId = NULL WHERE id = ?",
        args: [uid],
      });
    }
  }

  return NextResponse.json({ ok: true });
}
