import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { image } = await req.json();
  if (!image) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });

  const prompt = `Act as a Master Dietician and Computer Vision Analyst. Perform a granular nutritional decomposition of the food in this image.

ANALYSIS PROTOCOL:
1. SCALE DETECTION: Locate reference objects (cutlery, glassware, plate rims, or hands) to determine volumetric scale.
2. COMPONENT DECONSTRUCTION: Identify every distinct element (proteins, starches, fats, garnishes). For mixed dishes, estimate based on visible ratio of ingredients.
3. DENSITY MATH: Apply realistic weight-to-volume ratios (e.g., 1 cup leafy greens ≈ 30g, 1 cup cooked rice ≈ 190g, single macaroni ≈ 2g).
4. HIDDEN LOGIC: Account for invisible essentials typically present (e.g., cooking oils in sautéed vegetables).

Return ONLY a valid JSON object. NO markdown. NO explanation. Just raw JSON:
{"name":"<nombre del plato en español>","calories":<kcal totales entero>,"protein":<gramos float>,"carbs":<gramos float>,"fat":<gramos float>,"grams":<peso total entero>}

CRITICAL RULES:
- ALL values must be realistic based on what you actually see, never copy example numbers
- A single macaroni = ~2g, ~7 kcal. A steak = ~250g, ~500 kcal. A bowl of pasta = ~300g, ~450 kcal
- Account for cooking method: grilled vs fried changes fat significantly
- name must be descriptive and in Spanish
- Return ONLY the JSON, nothing else`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: image } },
            { type: "text", text: prompt },
          ],
        }],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    console.log("Groq response:", JSON.stringify(data, null, 2));
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`Vacío: ${JSON.stringify(data)}`);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON en respuesta");
    const parsed = JSON.parse(match[0]);
    return NextResponse.json(parsed);
  } catch (e: any) {
    console.error("Groq error:", e);
    return NextResponse.json({ error: "Error al analizar imagen" }, { status: 500 });
  }
}