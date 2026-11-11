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

async function subscriptionForRefundedCharge(charge: Stripe.Charge): Promise<Stripe.Subscription | null> {
  if (!stripe || charge.amount <= 0 || charge.amount_refunded < charge.amount) return null;

  const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
  const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!customerId || !paymentIntentId) return null;

  const payments = await stripe.invoicePayments.list({
    payment: { type: "payment_intent", payment_intent: paymentIntentId },
    limit: 100,
  });
  for (const payment of payments.data) {
    if (payment.payment.type !== "payment_intent") continue;
    const invoiceId = typeof payment.invoice === "string" ? payment.invoice : payment.invoice.id;
    const invoice = typeof payment.invoice === "string" ? await stripe.invoices.retrieve(invoiceId) : payment.invoice;
    if ("deleted" in invoice && invoice.deleted) continue;
    const invoiceCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    if (invoiceCustomerId !== customerId) continue;
    if (invoice.parent?.type !== "subscription_details") continue;
    const subscription = invoice.parent.subscription_details?.subscription;
    const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
    if (!subscriptionId) continue;
    return stripe.subscriptions.retrieve(subscriptionId);
  }

  return null;
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

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const sub = await subscriptionForRefundedCharge(charge);
    if (sub) {
      const chargeCustomerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
      const subscriptionCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      if (chargeCustomerId === subscriptionCustomerId && ["active", "trialing", "past_due"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
      }
      const uid = await userIdForSubscription(sub);
      if (uid) await syncStripeSubscriptionForUser(uid);
    }
  }

  return NextResponse.json({ ok: true });
}
