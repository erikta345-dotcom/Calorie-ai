import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getIP } from "@/lib/rateLimit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchSpanishFoods } from "@/lib/spanish-foods";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = (session.user as any).id as string;
  if (!(await checkRateLimit(`search:${uid}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
  }
  const q = req.nextUrl.searchParams.get("q");
  if (!q || typeof q !== "string" || q.trim().length === 0 || q.length > 100) {
    return NextResponse.json([], { status: 400 });
  }

  const spanishMatches = searchSpanishFoods(q).slice(0, 5).map((f) => ({
    id: f.id,
    name: f.name,
    calories: f.calories,
    protein: f.protein,
    carbs: f.carbs,
    fat: f.fat,
    source: "es-curado",
  }));

  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=10&fields=id,product_name,nutriments`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CalorieAI/1.0 (personal app)" },
    });
    const data = await res.json();

    const offResults = (data.products ?? [])
      .filter((p: any) => p.product_name && p.nutriments?.["energy-kcal_100g"])
      .slice(0, 8 - spanishMatches.length)
      .map((p: any) => ({
        id: p.id ?? p._id,
        name: p.product_name,
        calories: p.nutriments["energy-kcal_100g"] ?? 0,
        protein: p.nutriments["proteins_100g"] ?? 0,
        carbs: p.nutriments["carbohydrates_100g"] ?? 0,
        fat: p.nutriments["fat_100g"] ?? 0,
      }));

    return NextResponse.json([...spanishMatches, ...offResults]);
  } catch (e) {
    console.error(e);
    if (spanishMatches.length > 0) return NextResponse.json(spanishMatches);
    return NextResponse.json({ error: "Error buscando alimentos" }, { status: 500 });
  }
}
