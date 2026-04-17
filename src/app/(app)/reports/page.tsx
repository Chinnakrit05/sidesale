import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole("OWNER");
  const params = await searchParams;

  const today = new Date();
  const from = params.from ? startOfDay(new Date(params.from)) : startOfDay(subDays(today, 30));
  const to = params.to ? endOfDay(new Date(params.to)) : endOfDay(today);

  const [sales, byProduct, byCashier] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      include: { items: true, cashier: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { createdAt: { gte: from, lte: to }, status: "COMPLETED" } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { subtotal: "desc" } },
    }),
    prisma.sale.groupBy({
      by: ["cashierId"],
      where: { createdAt: { gte: from, lte: to }, status: "COMPLETED" },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  const cashierMap = new Map(
    users.map((u: typeof users[0]) => [u.id, u.name])
  );

  const totalSales = sales.reduce((s: number, r: typeof sales[0]) => s + Number(r.total), 0);
  const totalOrders = sales.length;
  const avg = totalOrders > 0 ? totalSales / totalOrders : 0;

  return (
    <ReportsClient
      dateFrom={from.toISOString().slice(0, 10)}
      dateTo={to.toISOString().slice(0, 10)}
      summary={{ totalSales, totalOrders, avg }}
      byProduct={byProduct.map((r: typeof byProduct[0]) => ({
        name: r.name,
        quantity: r._sum.quantity || 0,
        revenue: Number(r._sum.subtotal || 0),
      }))}
      byCashier={byCashier.map((r: typeof byCashier[0]) => ({
        name: cashierMap.get(r.cashierId) || r.cashierId,
        orders: r._count,
        revenue: Number(r._sum.total || 0),
      }))}
      sales={sales.map((s: typeof sales[0]) => ({
        id: s.id,
        number: s.number,
        total: Number(s.total),
        cashier: s.cashier.name,
        items: s.items.length,
        method: s.paymentMethod,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
