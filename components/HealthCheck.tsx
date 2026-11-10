"use client";

import { useEffect, useState } from "react";

export default function HealthCheck() {
  const [status, setStatus] = useState<"error" | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          setStatus("error");
          setMsg(d.error || "Database unreachable");
        }
      })
      .catch(() => {
        setStatus("error");
        setMsg("App failed to connect to server");
      });
  }, []);

  if (!status) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-50 dark:bg-zinc-900 border border-red-500/60 text-red-400 text-xs px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
      <p className="font-semibold mb-0.5">⚠️ Error del servidor</p>
      <p className="text-gray-400 dark:text-zinc-500 break-all">{msg}</p>
      <button
        onClick={() => setStatus(null)}
        className="mt-1.5 text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 text-xs"
      >
        Cerrar
      </button>
    </div>
  );
}
