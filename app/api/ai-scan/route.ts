import { NextRequest, NextResponse } from "next/server";

const BASE_PROMPT = `You are a registered dietitian with expert food recognition skills. Analyze this food image with maximum precision.

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
   - Tortilla española: 218kcal, 11g protein, 3g carbs, 17g fat
   - Paella (arroz con mariscos/pollo): 160kcal, 8g protein, 22g carbs, 4g fat
   - Croquetas (fritas): 230kcal, 8g protein, 20g carbs, 13g fat
   - Jamón ibérico/serrano: 375kcal, 43g protein, 0g carbs, 22g fat
   - Chorizo: 455kcal, 22g protein, 2g carbs, 40g fat
   - Lentils cooked (lentejas): 116kcal, 9g protein, 20g carbs, 0.4g fat
   - Chickpeas cooked (garbanzos): 164kcal, 8.9g protein, 27g carbs, 2.6g fat
   - Patatas fritas (fries): 312kcal, 3.4g protein, 41g carbs, 15g fat
   - Patatas bravas: 150kcal, 2g protein, 18g carbs, 7g fat
   - Pan con tomate: 190kcal, 5g protein, 30g carbs, 6g fat
   - Gazpacho: 40kcal, 1g protein, 4g carbs, 2g fat
   - Fabada/cocido (legumbre+embutido): 180kcal, 10g protein, 15g carbs, 8g fat
   - Churros: 350kcal, 6g protein, 46g carbs, 16g fat
   - Pizza (media): 266kcal, 11g protein, 33g carbs, 10g fat
   - Hamburguesa con pan: 295kcal, 17g protein, 24g carbs, 14g fat
   - Yogur natural: 59kcal, 3.5g protein, 4.7g carbs, 3.3g fat
   - Fruta (manzana/naranja/pera): 52kcal, 0.3g protein, 14g carbs, 0.2g fat
   - Plátano: 89kcal, 1.1g protein, 23g carbs, 0.3g fat
   - Aguacate: 160kcal, 2g protein, 9g carbs, 15g fat
5. COOKING: Adjust for method — fried adds ~8g fat per 100g food vs grilled.
6. ACCURACY: If unsure about a component, include it with conservative estimate rather than omitting.`;

const JSON_RULES = `
Return ONLY this exact JSON structure, no markdown, no explanation, nothing outside the JSON:
{"dish":"<nombre descriptivo del plato en español>","items":[{"name":"<nombre en español>","grams":<integer>,"calories":<integer>,"protein":<number>,"carbs":<number>,"fat":<number>}],"total":{"grams":<integer>,"calories":<integer>,"protein":<number>,"carbs":<number>,"fat":<number>}}

RULES:
- Between 1 and 7 items
- No item may have 0 calories
- All names must be in Spanish
- If image is unclear or not food, still return your best estimate`;

export async function POST(req: NextRequest) {
  const { image, description } = await req.json();
  if (!image) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });

  const contextLine = description?.trim()
    ? `\nUSER CONTEXT: The user says this dish is: "${description.trim()}". Use this as a strong hint when identifying components.\n`
    : "";

  const prompt = BASE_PROMPT + contextLine + JSON_RULES;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: BASE_PROMPT,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: image } },
              { type: "text", text: (contextLine || "") + JSON_RULES },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(`Groq error: ${data.error.message || JSON.stringify(data.error)}`);
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
