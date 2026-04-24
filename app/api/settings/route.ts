import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { id: "default" },
      });
    }
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { weight, goalCalories, goalProtein, goalCarbs, goalFat } = body;

    const settings = await prisma.userSettings.upsert({
      where: { id: "default" },
      update: { weight, goalCalories, goalProtein, goalCarbs, goalFat },
      create: { id: "default", weight, goalCalories, goalProtein, goalCarbs, goalFat },
    });
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
