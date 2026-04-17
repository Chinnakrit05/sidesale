import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET() {
  try {
    await requireRole("OWNER");

    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { sku: "asc" },
    });

    const header = "sku,barcode,name,description,category,unit,price,cost,stock,lowStockThreshold,active";
    const rows = products.map((p: typeof products[0]) =>
      [
        escapeCsv(p.sku),
        escapeCsv(p.barcode || ""),
        escapeCsv(p.name),
        escapeCsv(p.description || ""),
        escapeCsv(p.category?.name || ""),
        escapeCsv(p.unit || "piece"),
        String(p.price),
        String(p.cost),
        String(p.stock),
        String(p.lowStockThreshold),
        p.active ? "true" : "false",
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
