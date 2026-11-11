import type Stripe from "stripe";
import { db } from "@/lib/prisma";
import { PRICE_IDS, stripe } from "@/lib/stripe";
import type { Tier } from "@/lib/subscription";

const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>(["active", "trialing"]);
const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };

function tierForSubscription(subscription: Stripe.Subscription): Tier {
  const plan = subscription.metadata.plan ?? "";
  if (plan.includes("elite")) return "elite";
  if (plan.includes("pro")) return "pro";

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return "free";

  return Object.entries(PRICE_IDS).find(([, configuredPriceId]) => configuredPriceId === priceId)?.[0]?.startsWith("elite")
    ? "elite"
    : Object.entries(PRICE_IDS).some(([name, configuredPriceId]) => name.startsWith("pro") && configuredPriceId === priceId)
      ? "pro"
      : "free";
}

export async function syncStripeSubscriptionForUser(uid: string) {
  if (!stripe) return null;

  const userResult = await db.execute({
    sql: "SELECT email, tier, tierExpiresAt, stripeCustomerId FROM UserSettings WHERE id = ?",
    args: [uid],
  });
  const user = userResult.rows[0];
  if (!user) return null;

  const customerId = user.stripeCustomerId as string | null;
  if (!customerId) return null;

  const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 100 });
  const billingSubscriptions = subscriptions.data
    .filter((subscription) => ACTIVE_STATUSES.has(subscription.status) || subscription.status === "past_due")
    .sort((a, b) => {
      const activeDifference = Number(b.status === "active") - Number(a.status === "active");
      if (activeDifference) return activeDifference;
      return (b.items.data[0]?.current_period_end ?? 0) - (a.items.data[0]?.current_period_end ?? 0);
    });
  const activeSubscriptions = subscriptions.data
    .filter((subscription) => ACTIVE_STATUSES.has(subscription.status))
    .map((subscription) => ({ subscription, tier: tierForSubscription(subscription) }))
    .filter((item) => item.tier !== "free")
    .sort((a, b) => {
      const tierDifference = TIER_ORDER[b.tier] - TIER_ORDER[a.tier];
      if (tierDifference) return tierDifference;
      const statusDifference = Number(b.subscription.status === "active") - Number(a.subscription.status === "active");
      if (statusDifference) return statusDifference;
      return (b.subscription.items.data[0]?.current_period_end ?? 0) - (a.subscription.items.data[0]?.current_period_end ?? 0);
    });

  const selected = activeSubscriptions[0];
  let tier: Tier = selected?.tier ?? "free";
  let subscriptionId: string | null = selected?.subscription.id ?? null;

  if (user.email === "interns@oroi.eu") {
    tier = "elite";
  } else if (!selected && user.tierExpiresAt) {
    const expiresAt = new Date(user.tierExpiresAt as string);
    if (expiresAt > new Date()) tier = (user.tier as Tier) || "free";
  }

  await db.execute({
    sql: "UPDATE UserSettings SET tier = ?, stripeSubscriptionId = ?, tierExpiresAt = ? WHERE id = ?",
    args: [tier, subscriptionId, selected ? null : (user.tierExpiresAt as string | null), uid],
  });

  return {
    tier,
    hasSubscription: billingSubscriptions.length > 0,
    cancelAtPeriodEnd: selected?.subscription.cancel_at_period_end ?? billingSubscriptions[0]?.cancel_at_period_end ?? false,
    currentPeriodEnd: selected?.subscription.items.data[0]?.current_period_end ?? billingSubscriptions[0]?.items.data[0]?.current_period_end ?? null,
  };
}
