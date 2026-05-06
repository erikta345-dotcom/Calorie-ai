import { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  // Cleanup to prevent unbounded growth
  if (store.size > 5000) {
    store.forEach((v, k) => {
      if (now > v.resetAt) store.delete(k);
    });
  }
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

export function getIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
