import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  await requireRole("OWNER");
  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { product: true, user: true },
    }),
  ]);
  return (
    <StockClient
      products={products.map((p: typeof products[0]) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      }))}
      movements={movements.map((m: typeof movements[0]) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        reason: m.reason,
        productName: m.product.name,
        userName: m.user?.name || "",
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}
