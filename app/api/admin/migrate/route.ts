import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await db.execute(`
    CREATE TABLE IF NOT EXISTS UserPasswords (
      id TEXT PRIMARY KEY,
      passwordHash TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    await db.execute(`ALTER TABLE UserSettings ADD COLUMN email TEXT`);
  } catch {}
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
  return NextResponse.json({ ok: true });
}
