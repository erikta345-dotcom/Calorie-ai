import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, requireAuthOnly } from "@/lib/api-auth";
import { getUserTier, tierGte } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { uid, error } = await requireAuth("push", 10);
  if (error) return error;
  if (!tierGte(await getUserTier(uid), "pro")) {
    return NextResponse.json({ error: "Los recordatorios y las notificaciones push requieren plan Pro.", upgradeRequired: true }, { status: 403 });
  }
  const { subscription, mealTimes, utcOffset, timezone } = await req.json();
  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  const { endpoint, keys } = subscription;
  const { p256dh, auth } = keys;
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || endpoint.length > 500) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  if (typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "Invalid keys" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  let validTimezone: string | null = null;
  if (typeof timezone === "string" && timezone.length <= 100) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: timezone });
      validTimezone = timezone;
    } catch {}
  }
  const storedMealTimes = JSON.stringify({ times: mealTimes, timezone: validTimezone });
  await db.execute({
    sql: `INSERT INTO PushSubscription (id, userId, endpoint, p256dh, auth, mealTimes, utcOffset)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET
            userId=excluded.userId,
            p256dh=excluded.p256dh,
            auth=excluded.auth,
            mealTimes=excluded.mealTimes,
            utcOffset=excluded.utcOffset`,
    args: [id, uid, endpoint, p256dh, auth, storedMealTimes, utcOffset ?? 0],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { uid, error } = await requireAuthOnly();
  if (error) return error;
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.execute({
    sql: "DELETE FROM PushSubscription WHERE endpoint = ? AND userId = ?",
    args: [endpoint, uid],
  });
  return NextResponse.json({ ok: true });
}
