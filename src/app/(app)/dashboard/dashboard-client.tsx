"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type Props = {
  stats: {
    todaySales: number;
    todayOrders: number;
    productCount: number;
    lowStock: number;
  };
  trend: { date: string; total: number }[];
  top: { productId: string; name: string; quantity: number; revenue: number }[];
  recent: {
    id: string;
    number: string;
    total: number;
    cashier: string;
    items: number;
    createdAt: string;
    method: string;
    status: string;
  }[];
};

export function DashboardClient({ stats, trend, top, recent }: Props) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");

  const statCards = [
    { label: t("todaySales"), value: formatMoney(stats.todaySales), icon: DollarSign, bg: "bg-green-500/10", color: "text-green-600 dark:text-green-400" },
    { label: t("todayOrders"), value: String(stats.todayOrders), icon: ShoppingCart, bg: "bg-primary-container/10", color: "text-primary" },
    { label: t("totalProducts"), value: String(stats.productCount), icon: Package, bg: "bg-violet-500/10", color: "text-violet-600 dark:text-violet-400" },
    { label: t("lowStock"), value: String(stats.lowStock), icon: AlertTriangle, bg: stats.lowStock > 0 ? "bg-amber-500/10" : "bg-muted", color: stats.lowStock > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">{t("title")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s: typeof statCards[0]) => (
          <Card key={s.label} className="bg-surface-lowest">
            <CardContent className="p-5 flex items-start gap-3">
              <div className={cn("rounded-xl p-2.5", s.bg, s.color)}>
                <s.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold text-on-primary-container">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 bg-surface-lowest">
          <CardHeader>
            <CardTitle>{t("salesTrend")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(33,100%,50%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(33,100%,50%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Area type="monotone" dataKey="total" stroke="hsl(33,100%,50%)" fill="url(#gradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface-lowest">
          <CardHeader>
            <CardTitle>{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc("noData")}</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={100}
                    />
                    <Tooltip formatter={(v: number) => [v, "Qty"]} />
                    <Bar dataKey="quantity" fill="hsl(33,100%,50%)" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-surface-lowest">
        <CardHeader>
          <CardTitle>{t("recentSales")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">No.</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Cashier</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Items</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Method</th>
                <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Total</th>
                <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r: typeof recent[0], idx: number) => (
                <tr key={r.id} className={idx % 2 === 0 ? "bg-surface-low/50" : ""}>
                  <td className="p-3">
                    <Link href={`/receipt/${r.id}`} className="text-primary hover:underline font-mono text-xs">
                      {r.number}
                    </Link>
                    {r.status === "VOID" && (
                      <span className="ml-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/15 text-destructive">
                        VOID
                      </span>
                    )}
                  </td>
                  <td className="p-3">{r.cashier}</td>
                  <td className="p-3">{r.items}</td>
                  <td className="p-3">
                    <span className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      r.method === "CASH"
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-primary-container/15 text-primary"
                    )}>
                      {r.method}
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-on-primary-container">
                    {r.status === "VOID" ? (
                      <span className="text-destructive line-through">{formatMoney(r.total)}</span>
                    ) : (
                      formatMoney(r.total)
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">{tc("noData")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
