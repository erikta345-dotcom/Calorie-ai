"use client";

// Reemplaza las URLs con tus links de afiliado de MyProtein/Amazon
const PRODUCTS = {
  protein: {
    label: "Bajo en proteína hoy",
    name: "Proteína Whey Impact",
    desc: "1kg · 82g proteína/100g",
    emoji: "💪",
    url: "https://www.myprotein.com/sports-nutrition/impact-whey-protein/10530943.html", // ← tu link afiliado
  },
  calories: {
    label: "Necesitas más calorías",
    name: "Mass Gainer Hard",
    desc: "Carbos + proteína para ganar masa",
    emoji: "🏋️",
    url: "https://www.myprotein.com/sports-nutrition/hard-gainer-extreme/10529897.html", // ← tu link afiliado
  },
  default: {
    label: "Recomendado para ti",
    name: "Creatina Monohidrato",
    desc: "5g/día · fuerza + recuperación",
    emoji: "⚡",
    url: "https://www.myprotein.com/sports-nutrition/creatine-monohydrate/10528836.html", // ← tu link afiliado
  },
};

type Props = {
  proteinPercent: number;
  caloriePercent: number;
};

export default function AffiliateBar({ proteinPercent, caloriePercent }: Props) {
  const product =
    proteinPercent < 50
      ? PRODUCTS.protein
      : caloriePercent < 50
      ? PRODUCTS.calories
      : PRODUCTS.default;

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="mx-4 mt-3 mb-1 flex items-center gap-3 bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-3 hover:border-brand-500/40 transition-colors group"
    >
      <span className="text-2xl shrink-0">{product.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
          {product.label} · Patrocinado
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {product.name}
        </p>
        <p className="text-xs text-gray-400 dark:text-zinc-500">{product.desc}</p>
      </div>
      <span className="text-xs text-brand-500 font-medium group-hover:underline shrink-0">
        Ver →
      </span>
    </a>
  );
}
