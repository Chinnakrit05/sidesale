import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";

export async function GET() {
  try {
    await requireUser();
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, name: true, unit: true, stock: true, lowStockThreshold: true },
    });
    const lowStock = products
      .filter((p) => p.stock <= p.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock);
    return NextResponse.json(lowStock);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
