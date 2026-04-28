import { NextRequest, NextResponse } from "next/server";

const PROMPT = `You are a registered dietitian with expert food recognition skills. Analyze this food image with maximum precision.

METHODOLOGY:
1. SCALE: Use reference objects (standard plate ≈ 26cm diameter, fork ≈ 18cm, tablespoon ≈ 15ml) to estimate portion sizes.
2. DECOMPOSE: Identify EVERY distinct component — proteins, starches, vegetables, sauces, dressings, visible cooking oils.
3. QUANTIFY: Estimate each component's weight in grams using visual volume and density knowledge.
4. NUTRITION: Apply standard nutritional values per 100g:
   - Chicken breast grilled: 165kcal, 31g protein, 0g carbs, 3.6g fat
   - Chicken thigh grilled: 209kcal, 26g protein, 0g carbs, 11g fat
   - White rice cooked: 130kcal, 2.7g protein, 28g carbs, 0.3g fat
   - Pasta cooked: 158kcal, 5.8g protein, 31g carbs, 0.9g fat
   - Potato boiled: 87kcal, 1.9g protein, 20g carbs, 0.1g fat
   - Egg whole cooked: 155kcal, 13g protein, 1.1g carbs, 11g fat
   - Olive oil: 884kcal, 0g protein, 0g carbs, 100g fat
   - Beef steak grilled: 271kcal, 26g protein, 0g carbs, 18g fat
   - Salmon: 208kcal, 20g protein, 0g carbs, 13g fat
   - Bread white: 265kcal, 9g protein, 49g carbs, 3.2g fat
   - Mixed salad leaves: 20kcal, 2g protein, 3g carbs, 0.3g fat
5. COOKING: Adjust for method — fried adds ~8g fat per 100g food vs grilled.
6. ACCURACY: If unsure about a component, include it with conservative estimate rather than omitting.

Return ONLY this exact JSON structure, no markdown, no explanation, nothing outside the JSON:
{"dish":"<nombre descriptivo del plato en español>","items":[{"name":"<nombre en español>","grams":<integer>,"calories":<integer>,"protein":<number>,"carbs":<number>,"fat":<number>}],"total":{"grams":<integer>,"calories":<integer>,"protein":<number>,"carbs":<number>,"fat":<number>}}

RULES:
- Between 1 and 7 items
- No item may have 0 calories
- All names must be in Spanish
- If image is unclear or not food, still return your best estimate`;

export async function POST(req: NextRequest) {
  const { image } = await req.json();
  if (!image) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: PROMPT },
          ],
        }],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`Empty response: ${JSON.stringify(data)}`);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in response");

    const parsed = JSON.parse(match[0]);

    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      throw new Error("Invalid: no items array");
    }
    if (parsed.items.some((item: any) => !item.calories || item.calories <= 0)) {
      throw new Error("Invalid: zero-calorie item detected");
    }

    // Recalculate totals from items to avoid model math errors
    const total = parsed.items.reduce(
      (acc: any, item: any) => ({
        grams: acc.grams + (item.grams || 0),
        calories: acc.calories + (item.calories || 0),
        protein: acc.protein + (item.protein || 0),
        carbs: acc.carbs + (item.carbs || 0),
        fat: acc.fat + (item.fat || 0),
      }),
      { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    total.grams = Math.round(total.grams);
    total.calories = Math.round(total.calories);
    total.protein = Math.round(total.protein * 10) / 10;
    total.carbs = Math.round(total.carbs * 10) / 10;
    total.fat = Math.round(total.fat * 10) / 10;

    return NextResponse.json({ dish: parsed.dish, items: parsed.items, total });
  } catch (e: any) {
    console.error("AI scan error:", e.message);
    return NextResponse.json({ error: "Error al analizar imagen" }, { status: 500 });
  }
}
