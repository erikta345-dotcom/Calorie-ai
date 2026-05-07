import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getIP } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  if (!(await checkRateLimit(`barcode:${getIP(req)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }
  const code = req.nextUrl.searchParams.get("code");
  if (!code || typeof code !== "string" || code.length > 50 || !/^[\w-]+$/.test(code)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  try {
    const headers = { "User-Agent": "CalorieAI/1.0 (personal app)" };
    const url = (host: string) => `https://${host}/api/v0/product/${encodeURIComponent(code)}.json`;

    let data = await fetch(url("es.openfoodfacts.org"), { headers }).then((r) => r.json());
    if (data.status !== 1 || !data.product) {
      data = await fetch(url("world.openfoodfacts.org"), { headers }).then((r) => r.json());
    }

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const p = data.product;
    const n = p.nutriments;

    if (!n?.["energy-kcal_100g"] && !n?.["energy-kcal"]) {
      return NextResponse.json({ error: "Sin datos nutricionales" }, { status: 404 });
    }

    const servingG = parseFloat(p.serving_quantity) || null;

    return NextResponse.json({
      name: p.product_name || p.abbreviated_product_name || "Producto desconocido",
      brand: p.brands || null,
      calories: n["energy-kcal_100g"] ?? 0,
      protein: n["proteins_100g"] ?? 0,
      carbs: n["carbohydrates_100g"] ?? 0,
      fat: n["fat_100g"] ?? 0,
      servingG,
    });
  } catch {
    return NextResponse.json({ error: "Error buscando producto" }, { status: 500 });
  }
}
