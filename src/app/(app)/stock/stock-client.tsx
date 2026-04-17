"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDate } from "@/lib/utils";

type Product = { id: string; sku: string; name: string; unit: string; stock: number; lowStockThreshold: number };
type Movement = {
  id: string;
  type: "IN" | "OUT" | "ADJUST" | "VOID_RETURN";
  quantity: number;
  reason: string | null;
  productName: string;
  userName: string;
  createdAt: string;
};

export function StockClient({
  products,
  movements,
}: {
  products: Product[];
  movements: Movement[];
}) {
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!productId) return;
    setLoading(true);
    const res = await fetch("/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        type,
        quantity: parseInt(quantity, 10),
        reason: reason || null,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setQuantity("1");
    setReason("");
    router.refresh();
  }

  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display">{t("title")}</h1>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("adjust")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>{t("selectProduct")}</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — stock: {p.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("type")}</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">{t("typeIN")}</SelectItem>
                    <SelectItem value="OUT">{t("typeOUT")}</SelectItem>
                    <SelectItem value="ADJUST">{t("typeADJUST")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("quantity")}</Label>
                <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("reason")}</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. restock, damaged" />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full">
              {tc("save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" strokeWidth={2} />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc("noData")}</p>
            ) : (
              lowStock.map((p, idx) => (
                <div key={p.id} className={`flex justify-between text-sm pb-1 ${idx % 2 === 0 ? "bg-surface-low/40" : ""} px-3 py-2 -mx-2`}>
                  <span>{p.name}</span>
                  <span className="text-destructive font-semibold">{p.stock}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("actions")}</th>
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">Product</th>
                <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("quantity")}</th>
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("reason")}</th>
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">By</th>
                <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, idx) => (
                <tr key={m.id} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                  <td className="p-2">
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-xs",
                        m.type === "IN"
                          ? "bg-green-500/15 text-green-700 dark:text-green-400"
                          : m.type === "OUT"
                          ? "bg-red-500/15 text-red-700 dark:text-red-400"
                          : m.type === "VOID_RETURN"
                          ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                      )}
                    >
                      {t(`type${m.type}`)}
                    </span>
                  </td>
                  <td className="p-2">{m.productName}</td>
                  <td className="p-2 text-right">{m.quantity}</td>
                  <td className="p-2 text-muted-foreground">{m.reason}</td>
                  <td className="p-2">{m.userName}</td>
                  <td className="p-2 text-muted-foreground">{formatDate(m.createdAt)}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    {tc("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
