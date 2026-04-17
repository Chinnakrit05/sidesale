import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  await requireRole("OWNER");

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  const trendStart = startOfDay(subDays(today, 13));

  const [todaySales, todayOrders, productCount, lowStockRows, trendSales, topItems, recent] = await Promise.all([
    prisma.sale.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
      _sum: { total: true },
    }),
    prisma.sale.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd }, status: "COMPLETED" },
    }),
    prisma.product.count({ where: { active: true } }),
    prisma.product.findMany({ where: { active: true } }),
    prisma.sale.findMany({
      where: { createdAt: { gte: trendStart }, status: "COMPLETED" },
      select: { createdAt: true, total: true },
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { createdAt: { gte: subDays(today, 30) }, status: "COMPLETED" } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.sale.findMany({
      include: { cashier: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  // aggregate trend
  const bucket = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = format(subDays(today, i), "MM-dd");
    bucket.set(d, 0);
  }
  for (const s of trendSales) {
    const key = format(s.createdAt, "MM-dd");
    bucket.set(key, (bucket.get(key) || 0) + Number(s.total));
  }
  const trend = Array.from(bucket, ([date, total]: [string, number]) => ({ date, total }));

  return (
    <DashboardClient
      stats={{
        todaySales: Number(todaySales._sum.total || 0),
        todayOrders: todayOrders,
        productCount,
        lowStock: lowStockRows.filter((p) => p.stock <= p.lowStockThreshold).length,
      }}
      trend={trend}
      top={topItems.map((t) => ({
        productId: t.productId,
        name: t.name,
        quantity: t._sum.quantity || 0,
        revenue: Number(t._sum.subtotal || 0),
      }))}
      recent={recent.map((r) => ({
        id: r.id,
        number: r.number,
        total: Number(r.total),
        cashier: r.cashier.name,
        items: r.items.length,
        createdAt: r.createdAt.toISOString(),
        method: r.paymentMethod,
        status: r.status,
      }))}
    />
  );
}
