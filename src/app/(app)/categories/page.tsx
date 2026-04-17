import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  await requireRole("OWNER");
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return <CategoriesClient initial={categories} />;
}
