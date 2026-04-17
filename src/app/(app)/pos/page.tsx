import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { PosClient } from "./pos-client";

export default async function PosPage() {
  await requireUser();
  const [products, settings, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <PosClient
      products={products.map((p: typeof products[0]) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        unit: p.unit,
        price: Number(p.price),
        stock: p.stock,
        lowStockThreshold: p.lowStockThreshold,
      }))}
      categories={categories.map((c: typeof categories[0]) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }))}
      promptpayId={settings?.promptpayId || ""}
      shopName={settings?.shopName || "SideSale"}
      pointsConfig={{
        pointsPerBaht: settings?.pointsPerBaht ?? 1,
        pointValue: Number(settings?.pointValue ?? 0.25),
        minPointsRedeem: settings?.minPointsRedeem ?? 100,
      }}
    />
  );
}
