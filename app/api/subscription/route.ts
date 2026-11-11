import { NextResponse } from "next/server";
import { requireAuthOnly } from "@/lib/api-auth";
import { getUserTier } from "@/lib/subscription";
import { db } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { syncStripeSubscriptionForUser } from "@/lib/stripe-subscription-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;

  const tier = await getUserTier(uid);

  let hasStripe = false;
  try {
    const result = await db.execute({
      sql: "SELECT stripeCustomerId, stripeSubscriptionId FROM UserSettings WHERE id = ?",
      args: [uid],
    });
    const customerId = result.rows[0]?.stripeCustomerId as string | null;
    const subscriptionId = result.rows[0]?.stripeSubscriptionId as string | null;
    hasStripe = !!(customerId && stripe);

    if (stripe && customerId) {
      try {
        const synced = await syncStripeSubscriptionForUser(uid);
        if (synced) {
          return NextResponse.json({
            tier: synced.tier,
            hasStripe,
            hasSubscription: synced.hasSubscription,
            cancelAtPeriodEnd: synced.cancelAtPeriodEnd,
            currentPeriodEnd: synced.currentPeriodEnd,
          });
        }
      } catch (err) {
        console.error("Could not sync Stripe subscriptions", err);
      }
    }

    let hasSubscription = false;
    let cancelAtPeriodEnd = false;
    let currentPeriodEnd: number | null = null;
    if (stripe && subscriptionId && customerId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const subCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        if (subCustomerId === customerId) {
          hasSubscription = ["active", "trialing", "past_due"].includes(sub.status);
          cancelAtPeriodEnd = sub.cancel_at_period_end;
          currentPeriodEnd = sub.items.data[0]?.current_period_end ?? null;
        }
      } catch (err) {
        console.error("Could not retrieve Stripe subscription status", err);
      }
    }
    return NextResponse.json({ tier, hasStripe, hasSubscription, cancelAtPeriodEnd, currentPeriodEnd });
  } catch {}

  return NextResponse.json({ tier, hasStripe, hasSubscription: false, cancelAtPeriodEnd: false, currentPeriodEnd: null });
}
