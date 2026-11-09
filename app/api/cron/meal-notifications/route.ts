import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getUserTier, tierGte } from "@/lib/subscription";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function recentLocalSlots(now: Date, timezone: string | null, utcOffset: number) {
  const slots = new Set<string>();
  for (let minute = 0; minute <= 30; minute++) {
    const date = new Date(now.getTime() - minute * 60_000);
    let local: string;
    const parts = timezone ? (() => {
      try {
        return new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).formatToParts(date);
      } catch { return null; }
    })() : null;
    if (parts) {
      const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
      local = `${value("year")}-${value("month")}-${value("day")} ${value("hour")}:${value("minute")}`;
    } else {
      local = new Date(date.getTime() + utcOffset * 60_000).toISOString().slice(0, 16).replace("T", " ");
    }
    slots.add(local);
  }
  return slots;
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const valid = [process.env.CRON_SECRET, process.env.ADMIN_SECRET].filter(Boolean);
  if (!token || !valid.includes(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@calorieai.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const result = await db.execute("SELECT * FROM PushSubscription");
  const subs = result.rows;

  const now = new Date();
  await db.execute("DELETE FROM PushDelivery WHERE createdAt < datetime('now', '-30 days')").catch(() => {});

  const errors: string[] = [];
  const sent: string[] = [];

  // Batch-load all time alerts for users in this batch (avoids N+1)
  const userIds = subs.map((s) => s.userId as string).filter(Boolean);
  const alertsByUser = new Map<string, typeof subs>();
  if (userIds.length > 0) {
    try {
      const placeholders = userIds.map(() => "?").join(",");
      const alertsResult = await db.execute({
        sql: `SELECT * FROM CustomAlert WHERE userId IN (${placeholders}) AND type = 'time' AND enabled = 1`,
        args: userIds,
      });
      for (const alert of alertsResult.rows) {
        const uid = alert.userId as string;
        if (!alertsByUser.has(uid)) alertsByUser.set(uid, []);
        alertsByUser.get(uid)!.push(alert);
      }
    } catch {}
  }

  const tasks = subs.map(async (sub) => {
    if (!sub.userId || !tierGte(await getUserTier(sub.userId as string), "pro")) return;
    const utcOffset = Number(sub.utcOffset) || 0;

    let mealTimes: Record<string, string> = {};
    let timezone: string | null = null;
    try {
      const stored = JSON.parse(sub.mealTimes as string);
      if (stored?.times && typeof stored.times === "object") {
        mealTimes = stored.times;
        timezone = typeof stored.timezone === "string" ? stored.timezone : null;
      } else mealTimes = stored;
    } catch {}
    const recentSlots = recentLocalSlots(now, timezone, utcOffset);

    async function pushTo(payload: string, tag: string, deliveryKey: string) {
      const claim = await db.execute({
        sql: "INSERT OR IGNORE INTO PushDelivery (deliveryKey) VALUES (?)",
        args: [deliveryKey],
      });
      if (!claim.rowsAffected) return;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          payload
        );
        sent.push(tag);
      } catch (e: any) {
        await db.execute({ sql: "DELETE FROM PushDelivery WHERE deliveryKey = ?", args: [deliveryKey] }).catch(() => {});
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.execute({ sql: "DELETE FROM PushSubscription WHERE endpoint = ?", args: [sub.endpoint as string] });
          errors.push(`${tag}: expired (${e.statusCode})`);
        } else {
          errors.push(`${tag}: ${e.statusCode} ${e.message}`);
        }
      }
    }

    for (const [meal, time] of Object.entries(mealTimes)) {
      if (!/^\d{2}:\d{2}$/.test(time)) continue;
      const slot = Array.from(recentSlots).find((value) => value.endsWith(` ${time}`));
      if (!slot) continue;
      const [localDate] = slot.split(" ");
      await pushTo(
        JSON.stringify({ title: "⏰ NutriSnap", body: `Son las ${time}, ¡es la hora de ${capitalize(meal)}!`, tag: `meal-${meal}` }),
        `${meal}@${localDate}T${time}`,
        `${sub.id}:meal:${meal}:${localDate}:${time}`
      );
    }

    if (sub.userId) {
      for (const alert of alertsByUser.get(sub.userId as string) ?? []) {
        if (typeof alert.time !== "string" || !/^\d{2}:\d{2}$/.test(alert.time)) continue;
        const slot = Array.from(recentSlots).find((value) => value.endsWith(` ${alert.time as string}`));
        if (!slot) continue;
        const [localDate] = slot.split(" ");
        await pushTo(
          JSON.stringify({ title: "🔔 NutriSnap", body: alert.label as string, tag: `alert-${alert.id}` }),
          `alert:${alert.label}@${localDate}T${alert.time}`,
          `${sub.id}:alert:${alert.id}:${localDate}:${alert.time}`
        );
      }
    }
  });

  await Promise.allSettled(tasks);
  return NextResponse.json({ ok: true, subs: subs.length, time: new Date().toISOString(), sent, errors });
}
