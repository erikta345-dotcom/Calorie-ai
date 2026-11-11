import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST() {
  if (!stripe) return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });

  const { uid, error } = await requireAuth("subscription-cancel", 5);
  if (error) return error;

  const result = await db.execute({
    sql: "SELECT stripeCustomerId, stripeSubscriptionId FROM UserSettings WHERE id = ?",
    args: [uid],
  });
  const customerId = result.rows[0]?.stripeCustomerId as string | null;
  const subscriptionId = result.rows[0]?.stripeSubscriptionId as string | null;
  if (!customerId || !subscriptionId) {
    return NextResponse.json({ error: "No hay una suscripción de Stripe activa para cancelar." }, { status: 404 });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionCustomerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    if (subscriptionCustomerId !== customerId) {
      return NextResponse.json({ error: "La suscripción no pertenece a esta cuenta." }, { status: 403 });
    }
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      return NextResponse.json({ error: "La suscripción ya no está activa." }, { status: 409 });
    }

    const updated = subscription.cancel_at_period_end
      ? subscription
      : await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd: updated.items.data[0]?.current_period_end ?? null,
    });
  } catch (err) {
    console.error("Stripe subscription cancellation scheduling failed", err);
    return NextResponse.json({ error: "No se pudo cancelar la renovación. Inténtalo de nuevo." }, { status: 502 });
  }
}
