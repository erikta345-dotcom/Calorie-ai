import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pad(n: number) { return String(n).padStart(2, "0"); }
function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

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
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();

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
    const utcOffset = Number(sub.utcOffset) || 0;
    const localMins = (utcMins + utcOffset + 1440) % 1440;
    const localTime = `${pad(Math.floor(localMins / 60))}:${pad(localMins % 60)}`;

    let mealTimes: Record<string, string> = {};
    try { mealTimes = JSON.parse(sub.mealTimes as string); } catch {}

    async function pushTo(payload: string, tag: string) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint as string, keys: { p256dh: sub.p256dh as string, auth: sub.auth as string } },
          payload
        );
        sent.push(tag);
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await db.execute({ sql: "DELETE FROM PushSubscription WHERE endpoint = ?", args: [sub.endpoint as string] });
          errors.push(`${tag}: expired (${e.statusCode})`);
        } else {
          errors.push(`${tag}: ${e.statusCode} ${e.message}`);
        }
      }
    }

    for (const [meal, time] of Object.entries(mealTimes)) {
      if (time !== localTime) continue;
      await pushTo(
        JSON.stringify({ title: "⏰ Calorie AI", body: `Son las ${localTime}, ¡es la hora de ${capitalize(meal)}!`, tag: `meal-${meal}` }),
        `${meal}@${localTime}`
      );
    }

    if (sub.userId) {
      for (const alert of alertsByUser.get(sub.userId as string) ?? []) {
        if (alert.time !== localTime) continue;
        await pushTo(
          JSON.stringify({ title: "🔔 Calorie AI", body: alert.label as string, tag: `alert-${alert.id}` }),
          `alert:${alert.label}@${localTime}`
        );
      }
    }
  });

  await Promise.allSettled(tasks);
  return NextResponse.json({ ok: true, subs: subs.length, time: new Date().toISOString(), sent, errors });
}
