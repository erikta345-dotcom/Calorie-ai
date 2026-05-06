import { NextRequest } from "next/server";

export function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

let redis: import("@upstash/redis").Redis | null = null;
const limiters = new Map<string, import("@upstash/ratelimit").Ratelimit>();

function getLimiter(limit: number, windowMs: number) {
  const key = `${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    const { Ratelimit } = require("@upstash/ratelimit");
    const { Redis } = require("@upstash/redis");
    if (!redis) redis = Redis.fromEnv();
    limiters.set(
      key,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
        analytics: false,
      })
    );
  }
  return limiters.get(key)!;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return true;
  }
  try {
    const { success } = await getLimiter(limit, windowMs).limit(key);
    return success;
  } catch {
    return true;
  }
}
