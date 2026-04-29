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
  return NextResponse.json({ ok: true });
}
