import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

async function fetchOpenFoodFacts(code: string) {
  const headers = { "User-Agent": "NutriSnap/1.0 (personal app)" };
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

// FatSecret OAuth2 token cache (lives for the duration of the serverless instance)
let fsToken: { value: string; expiresAt: number } | null = null;

async function getFatSecretToken(): Promise<string | null> {
  const { FATSECRET_CLIENT_ID, FATSECRET_CLIENT_SECRET } = process.env;
  if (!FATSECRET_CLIENT_ID || !FATSECRET_CLIENT_SECRET) return null;
  if (fsToken && Date.now() < fsToken.expiresAt) return fsToken.value;

  const res = await fetch("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${FATSECRET_CLIENT_ID}:${FATSECRET_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials&scope=basic",
  });
  if (!res.ok) return null;
  const data = await res.json();
  fsToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return fsToken.value;
}

async function fetchFatSecret(code: string) {
  const token = await getFatSecretToken();
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const base = "https://platform.fatsecret.com/rest/server.api";

  const barcodeRes = await fetch(
    `${base}?method=food.find_id_for_barcode&barcode=${encodeURIComponent(code)}&format=json`,
    { headers }
  );
  if (!barcodeRes.ok) return null;
  const barcodeData = await barcodeRes.json();
  const foodId = barcodeData?.food_id?.value;
  if (!foodId) return null;

  const foodRes = await fetch(
    `${base}?method=food.get.v4&food_id=${foodId}&format=json`,
    { headers }
  );
  if (!foodRes.ok) return null;
  const foodData = await foodRes.json();
  const food = foodData?.food;
  if (!food) return null;

  // Use 100g serving if available, else first serving
  const servings: any[] = Array.isArray(food.servings?.serving)
    ? food.servings.serving
    : food.servings?.serving
    ? [food.servings.serving]
    : [];

  const per100 = servings.find((s) => s.serving_description === "100 g") ?? servings[0];
  if (!per100 || !per100.calories) return null;

  const factor = per100.serving_description === "100 g" ? 1 : 100 / (parseFloat(per100.metric_serving_amount) || 100);

  return {
    name: food.food_name || "Producto desconocido",
    brand: food.brand_name || null,
    calories: Math.round(parseFloat(per100.calories) * factor),
    protein: Math.round(parseFloat(per100.protein ?? "0") * factor * 10) / 10,
    carbs: Math.round(parseFloat(per100.carbohydrate ?? "0") * factor * 10) / 10,
    fat: Math.round(parseFloat(per100.fat ?? "0") * factor * 10) / 10,
    servingG: null,
  };
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth("barcode", 30);
  if (error) return error;
  const code = req.nextUrl.searchParams.get("code");
  if (!code || typeof code !== "string" || code.length > 50 || !/^[\w-]+$/.test(code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  try {
    const product = (await fetchOpenFoodFacts(code)) ?? (await fetchFatSecret(code));
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Error buscando producto" }, { status: 500 });
  }
}
