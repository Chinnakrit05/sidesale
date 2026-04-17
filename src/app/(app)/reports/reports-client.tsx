"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatDate, cn } from "@/lib/utils";

type Props = {
  dateFrom: string;
  dateTo: string;
  summary: { totalSales: number; totalOrders: number; avg: number };
  byProduct: { name: string; quantity: number; revenue: number }[];
  byCashier: { name: string; orders: number; revenue: number }[];
  sales: {
    id: string; number: string; total: number; cashier: string; items: number; method: string; createdAt: string;
  }[];
};

export function ReportsClient({ dateFrom, dateTo, summary, byProduct, byCashier, sales }: Props) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const router = useRouter();

  function applyFilter(from: string, to: string) {
    router.push(`/reports?from=${from}&to=${to}`);
  }

  function exportCSV() {
    const header = "No,Date,Cashier,Items,Method,Total\n";
    const rows = sales.map((s) =>
      `${s.number},${s.createdAt},${s.cashier},${s.items},${s.method},${s.total}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statCards = [
    { label: t("totalSales"), value: formatMoney(summary.totalSales), icon: DollarSign },
    { label: t("totalOrders"), value: String(summary.totalOrders), icon: ShoppingCart },
    { label: t("avgOrder"), value: formatMoney(summary.avg), icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold font-display">{t("title")}</h1>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4" strokeWidth={2} /> {t("export")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>{t("dateFrom")}</Label>
            <Input type="date" defaultValue={dateFrom} id="rf" />
          </div>
          <div className="space-y-1">
            <Label>{t("dateTo")}</Label>
            <Input type="date" defaultValue={dateTo} id="rt" />
          </div>
          <Button onClick={() => {
            const from = (document.getElementById("rf") as HTMLInputElement).value;
            const to = (document.getElementById("rt") as HTMLInputElement).value;
            applyFilter(from, to);
          }}>
            {tc("search")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className="rounded-lg p-2 bg-muted text-primary"><s.icon className="h-5 w-5" strokeWidth={2} /></div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>{t("byProduct")}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left">
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">Product</th>
                <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Qty</th>
                <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Revenue</th>
              </tr></thead>
              <tbody>
                {byProduct.map((r, idx) => (
                  <tr key={r.name} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right">{r.quantity}</td>
                    <td className="p-2 text-right font-semibold">{formatMoney(r.revenue)}</td>
                  </tr>
                ))}
                {byProduct.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">{tc("noData")}</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("byCashier")}</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left">
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">Cashier</th>
                <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Orders</th>
                <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">Revenue</th>
              </tr></thead>
              <tbody>
                {byCashier.map((r, idx) => (
                  <tr key={r.name} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                    <td className="p-2">{r.name}</td>
                    <td className="p-2 text-right">{r.orders}</td>
                    <td className="p-2 text-right font-semibold">{formatMoney(r.revenue)}</td>
                  </tr>
                ))}
                {byCashier.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">{tc("noData")}</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
