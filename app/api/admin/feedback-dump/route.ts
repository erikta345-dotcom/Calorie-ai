import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const secret = process.env.ADMIN_SECRET ?? "";
  if (!secret || token.length !== secret.length || !timingSafeEqual(Buffer.from(token), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await db.execute(
    "SELECT author, stars, message, createdAt FROM Feedback ORDER BY createdAt DESC"
  );
  return NextResponse.json(result.rows);
}
