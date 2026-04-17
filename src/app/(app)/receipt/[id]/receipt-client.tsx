"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Download, Printer, Plus, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatDate, cn } from "@/lib/utils";

type Sale = {
  id: string;
  number: string;
  createdAt: string;
  cashierName: string;
  customerName: string | null;
  paymentMethod: "CASH" | "PROMPTPAY";
  status: "COMPLETED" | "VOID";
  voidReason: string | null;
  voidAt: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  change: number;
  pointsEarned: number;
  pointsRedeemed: number;
  items: {
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
};

export function ReceiptClient({
  sale: initialSale,
  shopName,
  userRole,
}: {
  sale: Sale;
  shopName: string;
  userRole: string;
}) {
  const t = useTranslations("receipt");
  const tp = useTranslations("payment");
  const tv = useTranslations("void");
  const tu = useTranslations("units");
  const router = useRouter();
  const [sale, setSale] = useState(initialSale);
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const isVoid = sale.status === "VOID";
  const canVoid = userRole === "OWNER" && !isVoid;

  function downloadPdf() {
    window.open(`/api/receipt/${sale.id}/pdf`, "_blank");
  }

  async function handleVoid() {
    if (!voidReason.trim()) return;
    setVoiding(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to void sale");
        return;
      }
      setSale({
        ...sale,
        status: "VOID",
        voidReason: voidReason.trim(),
        voidAt: new Date().toISOString(),
      });
      setVoidOpen(false);
    } finally {
      setVoiding(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="no-print flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/pos")}>
          <Plus className="h-4 w-4" /> {t("newSale")}
        </Button>
        <div className="flex gap-2">
          {canVoid && (
            <Button variant="destructive" size="sm" onClick={() => setVoidOpen(true)}>
              <Ban className="h-4 w-4" strokeWidth={2} /> {tv("voidSale")}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" strokeWidth={2} /> {t("print")}
          </Button>
          <Button size="sm" onClick={downloadPdf}>
            <Download className="h-4 w-4" strokeWidth={2} /> {t("downloadPdf")}
          </Button>
        </div>
      </div>

      {isVoid && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm">
          <div className="font-semibold text-destructive">{tv("voided")}</div>
          {sale.voidReason && (
            <div className="text-muted-foreground mt-1">{tv("reason")}: {sale.voidReason}</div>
          )}
          {sale.voidAt && (
            <div className="text-muted-foreground text-xs mt-1">{formatDate(sale.voidAt)}</div>
          )}
        </div>
      )}

      <Card className={cn(
        "p-6 font-mono text-sm bg-white text-black dark:bg-white dark:text-black",
        isVoid && "opacity-60"
      )}>
        {isVoid && (
          <div className="text-center mb-2">
            <span className="text-red-600 font-bold text-lg border-2 border-red-600 px-3 py-0.5 rounded inline-block rotate-[-5deg]">
              VOID
            </span>
          </div>
        )}

        <div className="text-center mb-4">
          <div className="text-lg font-bold">{shopName}</div>
          <div className="text-xs">{t("title")}</div>
        </div>

        <div className="grid grid-cols-2 gap-y-1 text-xs mb-3">
          <div>{t("number")}:</div>
          <div className="text-right">{sale.number}</div>
          <div>{t("date")}:</div>
          <div className="text-right">{formatDate(sale.createdAt)}</div>
          <div>{t("cashier")}:</div>
          <div className="text-right">{sale.cashierName}</div>
          <div>{t("method")}:</div>
          <div className="text-right">{tp(sale.paymentMethod.toLowerCase())}</div>
          {sale.customerName && (
            <>
              <div>{t("customer")}:</div>
              <div className="text-right">{sale.customerName}</div>
            </>
          )}
        </div>

        <div className="bg-surface-low/40 h-px my-2" />

        <table className="w-full text-xs">
          <tbody>
            {sale.items.map((i, idx) => (
              <tr key={idx} className="align-top">
                <td colSpan={2} className="py-0.5">
                  <div className="flex justify-between">
                    <span>{i.name}</span>
                    <span>{formatMoney(i.subtotal)}</span>
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {i.quantity} {tu(i.unit || "piece")} × {formatMoney(i.unitPrice)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bg-surface-low/40 h-px my-2" />

        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatMoney(sale.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
            <span>Total</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          {sale.paymentMethod === "CASH" && (
            <>
              <div className="flex justify-between">
                <span>Paid</span>
                <span>{formatMoney(sale.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span>
                <span>{formatMoney(sale.change)}</span>
              </div>
            </>
          )}
        </div>

        {(sale.pointsEarned > 0 || sale.pointsRedeemed > 0) && (
          <>
            <div className="bg-surface-low/40 h-px my-2" />
            <div className="space-y-0.5 text-xs">
              {sale.pointsRedeemed > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>{t("pointsUsed")}</span>
                  <span>-{sale.pointsRedeemed.toLocaleString()} pts</span>
                </div>
              )}
              {sale.pointsEarned > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t("pointsEarned")}</span>
                  <span>+{sale.pointsEarned.toLocaleString()} pts</span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="border-t border-dashed my-3" />
        <div className="text-center text-xs">{t("thankyou")}</div>
      </Card>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tv("voidSale")} #{sale.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{tv("voidWarning")}</p>
            <div className="space-y-1">
              <Label>{tv("reason")}</Label>
              <Input
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder={tv("reasonPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>{tv("cancel")}</Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={voiding || !voidReason.trim()}
            >
              {voiding ? tv("processing") : tv("confirmVoid")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
