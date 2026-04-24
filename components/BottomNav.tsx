"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", icon: "🏠", label: "Hoy" },
  { href: "/scan", icon: "📸", label: "Escanear" },
  { href: "/search", icon: "🔍", label: "Buscar" },
  { href: "/history", icon: "📊", label: "Historial" },
  { href: "/settings", icon: "⚙️", label: "Ajustes" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-950/90 backdrop-blur border-t border-zinc-800 flex safe-bottom z-50">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              active ? "text-brand-400" : "text-zinc-500"
            }`}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
