import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json([], { status: 400 });

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=id,product_name,nutriments`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CalorieAI/1.0 (personal app)" },
    });
    const data = await res.json();

    const results = (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .slice(0, 8)
      .map((p: any) => ({
        id: p.id ?? p._id,
        name: p.product_name,
        calories: p.nutriments["energy-kcal_100g"] ?? 0,
        protein: p.nutriments["proteins_100g"] ?? 0,
        carbs: p.nutriments["carbohydrates_100g"] ?? 0,
        fat: p.nutriments["fat_100g"] ?? 0,
      }));

    return NextResponse.json(results);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error buscando alimentos" }, { status: 500 });
  }
}
