import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 400: "#a3e635", 500: "#84cc16", 600: "#65a30d" },
        protein: "#f97316",
        carbs: "#3b82f6",
        fat: "#eab308",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        primary: { DEFAULT: "rgb(var(--primary) / <alpha-value>)", foreground: "rgb(var(--primary-foreground) / <alpha-value>)" },
        secondary: { DEFAULT: "rgb(var(--secondary) / <alpha-value>)", foreground: "rgb(var(--secondary-foreground) / <alpha-value>)" },
        muted: { DEFAULT: "rgb(var(--muted) / <alpha-value>)", foreground: "rgb(var(--muted-foreground) / <alpha-value>)" },
        accent: { DEFAULT: "rgb(var(--accent) / <alpha-value>)", foreground: "rgb(var(--accent-foreground) / <alpha-value>)" },
        destructive: { DEFAULT: "rgb(var(--destructive) / <alpha-value>)" },
        popover: { DEFAULT: "rgb(var(--popover) / <alpha-value>)", foreground: "rgb(var(--popover-foreground) / <alpha-value>)" },
        card: { DEFAULT: "rgb(var(--card) / <alpha-value>)", foreground: "rgb(var(--card-foreground) / <alpha-value>)" },
      },
    },
  },
  plugins: [],
};

export default config;
