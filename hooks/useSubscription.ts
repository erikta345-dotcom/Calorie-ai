import { useEffect, useState } from "react";
import type { Tier } from "@/lib/subscription";

export function useSubscription() {
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.json())
      .then((d) => setTier(d.tier ?? "free"))
      .catch(() => setTier("free"))
      .finally(() => setLoading(false));
  }, []);

  return { tier, loading };
}
