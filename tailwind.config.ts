import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 400: "#a3e635", 500: "#84cc16", 600: "#65a30d" },
        protein: "#f97316",
        carbs: "#3b82f6",
        fat: "#eab308",
      },
    },
  },
  plugins: [],
};

export default config;
