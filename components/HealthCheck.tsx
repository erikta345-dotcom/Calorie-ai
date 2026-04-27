"use client";

import { useEffect, useState } from "react";

export default function HealthCheck() {
  const [status, setStatus] = useState<"ok" | "error" | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setStatus("ok");
          setTimeout(() => setStatus(null), 3000);
        } else {
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

  if (status === "ok") {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-green-500/40 text-green-400 text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
        Servidor OK
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-red-500/60 text-red-400 text-xs px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center">
      <p className="font-semibold mb-0.5">⚠️ Error del servidor</p>
      <p className="text-zinc-500 break-all">{msg}</p>
      <button
        onClick={() => setStatus(null)}
        className="mt-1.5 text-zinc-600 hover:text-zinc-400 text-xs"
      >
        Cerrar
      </button>
    </div>
  );
}
