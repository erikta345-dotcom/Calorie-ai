"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, ScanLine, Search, BarChart2, Bell, MessageCircle, Settings, ChefHat, ChevronRight, ChevronLeft } from "lucide-react";

const PAGE_0 = [
  { href: "/", icon: Home, label: "Hoy" },
  { href: "/scan", icon: ScanLine, label: "Escanear" },
  { href: "/search", icon: Search, label: "Buscar" },
  { href: "/history", icon: BarChart2, label: "Historial" },
];

const PAGE_1 = [
  { href: "/recipes", icon: ChefHat, label: "Recetas" },
  { href: "/alerts", icon: Bell, label: "Alertas" },
  { href: "/settings", icon: Settings, label: "Ajustes" },
  { href: "/feedback", icon: MessageCircle, label: "Feed" },
];

const PAGE_1_ROUTES = PAGE_1.map((t) => t.href);

export default function BottomNav() {
  const pathname = usePathname();
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(PAGE_1_ROUTES.includes(pathname) ? 1 : 0);
  }, [pathname]);

  const tabs = page === 0 ? PAGE_0 : PAGE_1;

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
      <button
        onClick={() => setPage((p) => (p === 0 ? 1 : 0))}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {page === 0 ? <ChevronRight size={20} strokeWidth={1.8} /> : <ChevronLeft size={20} strokeWidth={1.8} />}
        {page === 0 ? "Más" : "Atrás"}
      </button>
    </nav>
  );
}
