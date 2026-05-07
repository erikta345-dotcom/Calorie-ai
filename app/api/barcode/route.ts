import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getIP } from "@/lib/rateLimit";

async function fetchOpenFoodFacts(code: string) {
  const headers = { "User-Agent": "CalorieAI/1.0 (personal app)" };
  const url = (host: string) => `https://${host}/api/v0/product/${encodeURIComponent(code)}.json`;

  let data = await fetch(url("es.openfoodfacts.org"), { headers }).then((r) => r.json());
  if (data.status !== 1 || !data.product) {
    data = await fetch(url("world.openfoodfacts.org"), { headers }).then((r) => r.json());
  }
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments;
  if (!n?.["energy-kcal_100g"] && !n?.["energy-kcal"]) return null;

  return {
    name: p.product_name || p.abbreviated_product_name || "Producto desconocido",
    brand: p.brands || null,
    calories: n["energy-kcal_100g"] ?? 0,
    protein: n["proteins_100g"] ?? 0,
    carbs: n["carbohydrates_100g"] ?? 0,
    fat: n["fat_100g"] ?? 0,
    servingG: parseFloat(p.serving_quantity) || null,
  };
}

async function fetchEdamam(code: string) {
  const { EDAMAM_APP_ID, EDAMAM_APP_KEY } = process.env;
  if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) return null;

  const res = await fetch(
    `https://api.edamam.com/api/food-database/v2/parser?upc=${encodeURIComponent(code)}&app_id=${EDAMAM_APP_ID}&app_key=${EDAMAM_APP_KEY}`
  );
  if (!res.ok) return null;
  const data = await res.json();

  const food = data.hints?.[0]?.food ?? data.parsed?.[0]?.food;
  if (!food) return null;

  const n = food.nutrients;
  if (!n?.ENERC_KCAL) return null;

  return {
    name: food.label || "Producto desconocido",
    brand: food.brand || null,
    calories: Math.round(n.ENERC_KCAL ?? 0),
    protein: Math.round((n.PROCNT ?? 0) * 10) / 10,
    carbs: Math.round((n.CHOCDF ?? 0) * 10) / 10,
    fat: Math.round((n.FAT ?? 0) * 10) / 10,
    servingG: null,
  };
}

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(`barcode:${getIP(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code || typeof code !== "string" || code.length > 50 || !/^[\w-]+$/.test(code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  try {
    const product = (await fetchOpenFoodFacts(code)) ?? (await fetchEdamam(code));
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error buscando producto" }, { status: 500 });
  }
}
