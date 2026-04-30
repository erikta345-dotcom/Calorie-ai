import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no key" }, { status: 500 });

  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const vision = data.data?.filter((m: any) =>
    m.id.includes("vision") || m.id.includes("llama-4") || m.id.includes("scout") || m.id.includes("maverick")
  ).map((m: any) => m.id);
  return NextResponse.json({ vision, all: data.data?.map((m: any) => m.id) });
}
