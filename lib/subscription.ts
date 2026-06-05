import { db } from "@/lib/prisma";

export type Tier = "free" | "pro" | "elite";

export const OWNER_EMAIL = "interns@oroi.eu";

export async function getUserTier(uid: string): Promise<Tier> {
  if (uid === OWNER_EMAIL) return "elite";

  try {
    const result = await db.execute({
      sql: "SELECT tier, tierExpiresAt, email FROM UserSettings WHERE id = ?",
      args: [uid],
    });
    if (!result.rows.length) return "free";
    const row = result.rows[0];

    if ((row.email as string) === OWNER_EMAIL) return "elite";

    const tier = (row.tier as string) || "free";
    const expiresAt = row.tierExpiresAt as string | null;

    if (tier !== "free" && expiresAt && new Date(expiresAt) < new Date()) return "free";

    return tier as Tier;
  } catch {
    return "free";
  }
}

export function tierGte(tier: Tier, required: Tier): boolean {
  const order: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };
  return order[tier] >= order[required];
}

export function maxHistoryDays(tier: Tier): number {
  if (tier === "elite") return 365;
  if (tier === "pro") return 30;
  return 7;
}

export function maxAiScansPerDay(tier: Tier): number {
  return tier === "free" ? 3 : Infinity;
}
