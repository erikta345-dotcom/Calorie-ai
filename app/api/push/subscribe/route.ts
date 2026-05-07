import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`push:${uid}`, 10, 60_000))) return NextResponse.json({ error: "Demasiadas peticiones." }, { status: 429 });
  const { subscription, mealTimes, utcOffset } = await req.json();
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
  await db.execute({
    sql: `INSERT INTO PushSubscription (id, userId, endpoint, p256dh, auth, mealTimes, utcOffset)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET
            userId=excluded.userId,
            p256dh=excluded.p256dh,
            auth=excluded.auth,
            mealTimes=excluded.mealTimes,
            utcOffset=excluded.utcOffset`,
    args: [id, uid, endpoint, p256dh, auth, JSON.stringify(mealTimes), utcOffset ?? 0],
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  await db.execute({
    sql: "DELETE FROM PushSubscription WHERE endpoint = ? AND userId = ?",
    args: [endpoint, uid],
  });
  return NextResponse.json({ ok: true });
}
