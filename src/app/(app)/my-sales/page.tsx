import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { startOfDay, endOfDay } from "date-fns";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, cn } from "@/lib/utils";

export default async function MySalesPage() {
  const user = await requireUser();
  const t = await getTranslations("mySales");
  const tc = await getTranslations("common");
  const tp = await getTranslations("payment");

  const today = new Date();
  const sales = await prisma.sale.findMany({
    where: { cashierId: user.id, status: "COMPLETED" },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const todaySales = sales.filter(
    (s: typeof sales[0]) => s.createdAt >= startOfDay(today) && s.createdAt <= endOfDay(today)
  );
  const todayTotal = todaySales.reduce((s: number, r: typeof sales[0]) => s + Number(r.total), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("today")} — {tc("total")}</div>
            <div className="text-lg sm:text-2xl font-bold">{formatMoney(todayTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("today")} — Orders</div>
            <div className="text-lg sm:text-2xl font-bold">{todaySales.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">No.</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Items</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Method</th>
                <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("total")}</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s: typeof sales[0]) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">
                    <Link href={`/receipt/${s.id}`} className="text-primary hover:underline font-mono text-xs">
                      {s.number}
                    </Link>
                  </td>
                  <td className="p-3">{s.items.length}</td>
                  <td className="p-3">
                    <span className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs",
                      s.paymentMethod === "CASH"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                    )}>
                      {s.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold">{formatMoney(Number(s.total))}</td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{tc("noData")}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
