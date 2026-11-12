import { useCallback, useEffect, useState } from "react";
import type { Tier } from "@/lib/subscription";

export function useSubscription() {
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let inFlight = false;

    const refreshSubscription = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch("/api/subscription", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not refresh subscription");
        const data = await response.json();
        setTier(data.tier ?? "free");
      } catch {
        // Preserve the last known tier during temporary network errors.
        setTier((current) => current ?? "free");
      } finally {
        inFlight = false;
        setLoading(false);
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshSubscription();
    };

    void refreshSubscription();
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, []);

  return { tier, loading };
}
