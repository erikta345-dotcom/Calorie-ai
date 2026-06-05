import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const expected = process.env.ADMIN_SECRET ?? "";
  if (
    !expected ||
    secret.length !== expected.length ||
    !timingSafeEqual(Buffer.from(secret), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Core tables
  await db.execute(`
    CREATE TABLE IF NOT EXISTS UserPasswords (
      id TEXT PRIMARY KEY,
      passwordHash TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Recipe (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      items TEXT NOT NULL,
      totalCalories REAL DEFAULT 0,
      totalProtein REAL DEFAULT 0,
      totalCarbs REAL DEFAULT 0,
      totalFat REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS WeightLog (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      weight REAL NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS CustomAlert (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      time TEXT,
      threshold REAL,
      enabled INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Feedback (
      id TEXT PRIMARY KEY,
      userId TEXT,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      stars REAL DEFAULT 5,
      reply TEXT,
      resolved INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS FeedbackLike (
      id TEXT PRIMARY KEY,
      feedbackId TEXT NOT NULL,
      userId TEXT NOT NULL,
      UNIQUE(feedbackId, userId)
    )
  `);

  // Column additions (idempotent)
  const alters = [
    `ALTER TABLE UserSettings ADD COLUMN email TEXT`,
    `ALTER TABLE UserSettings ADD COLUMN height REAL DEFAULT 175`,
    `ALTER TABLE UserSettings ADD COLUMN age INTEGER DEFAULT 25`,
    `ALTER TABLE UserSettings ADD COLUMN gender TEXT DEFAULT 'male'`,
    `ALTER TABLE UserSettings ADD COLUMN goal TEXT DEFAULT 'maintain'`,
    `ALTER TABLE UserSettings ADD COLUMN mealTimes TEXT`,
    `ALTER TABLE Feedback ADD COLUMN stars REAL DEFAULT 5`,
    `ALTER TABLE Feedback ADD COLUMN userId TEXT`,
    `ALTER TABLE Feedback ADD COLUMN reply TEXT`,
    `ALTER TABLE Feedback ADD COLUMN resolved INTEGER DEFAULT 0`,
    `ALTER TABLE UserSettings ADD COLUMN tier TEXT DEFAULT 'free'`,
    `ALTER TABLE UserSettings ADD COLUMN stripeCustomerId TEXT`,
    `ALTER TABLE UserSettings ADD COLUMN stripeSubscriptionId TEXT`,
    `ALTER TABLE UserSettings ADD COLUMN tierExpiresAt TEXT`,
  ];
  for (const sql of alters) {
    await db.execute(sql).catch(() => {});
  }

  // Indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_food_user_date ON FoodEntry(userId, date)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_push_user ON PushSubscription(userId)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_alert_user_type ON CustomAlert(userId, type, enabled)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_feedback_like ON FeedbackLike(feedbackId, userId)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_weight_user ON WeightLog(userId)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS PromoCodes (
      code TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'pro',
      maxUses INTEGER DEFAULT 1,
      uses INTEGER DEFAULT 0,
      tierExpiresAt TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  return NextResponse.json({ ok: true });
}
