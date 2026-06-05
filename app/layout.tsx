export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import "./globals.css";
import HealthCheck from "@/components/HealthCheck";
import MealNotifications from "@/components/MealNotifications";
import Providers from "@/components/Providers";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "NutriSnap",
  description: "Tracker de calorías con IA",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "NutriSnap" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={cn("font-sans", geist.variable)} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-white dark:bg-zinc-950 text-gray-900 dark:text-white antialiased">
        <Providers>
          <HealthCheck />
          <MealNotifications />
          {children}
        </Providers>
      </body>
    </html>
  );
}
