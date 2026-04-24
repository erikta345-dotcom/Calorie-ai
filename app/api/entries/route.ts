import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  try {
    const entries = await prisma.foodEntry.findMany({
      where: date ? { date } : undefined,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(entries);
  } catch (e) {
    return NextResponse.json({ error: "Error al obtener entradas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, meal, name, calories, protein, carbs, fat, grams, source } = body;

    if (!date || !meal || !name || calories == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const entry = await prisma.foodEntry.create({
      data: {
        date,
        meal,
        name,
        calories: parseFloat(calories),
        protein: parseFloat(protein ?? 0),
        carbs: parseFloat(carbs ?? 0),
        fat: parseFloat(fat ?? 0),
        grams: parseFloat(grams ?? 100),
        source: source ?? "manual",
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error al crear entrada" }, { status: 500 });
  }
}
