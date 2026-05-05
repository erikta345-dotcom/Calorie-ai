"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ScanLine, Search, BarChart2, Bell, MessageCircle, Settings } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Hoy" },
  { href: "/scan", icon: ScanLine, label: "Escanear" },
  { href: "/search", icon: Search, label: "Buscar" },
  { href: "/history", icon: BarChart2, label: "Historial" },
  { href: "/alerts", icon: Bell, label: "Alertas" },
  { href: "/feedback", icon: MessageCircle, label: "Feed" },
  { href: "/settings", icon: Settings, label: "Ajustes" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/60 flex safe-bottom z-50">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide transition-colors ${
              active ? "text-brand-400" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
