import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  await requireRole("OWNER");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <ProductsClient
      initial={products.map((p: typeof products[0]) => ({
        ...p,
        price: p.price.toString(),
        cost: p.cost.toString(),
      }))}
      categories={categories.map((c: typeof categories[0]) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }))}
    />
  );
}
