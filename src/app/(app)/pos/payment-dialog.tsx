"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Banknote, QrCode, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney, cn } from "@/lib/utils";
import { addOfflineSale, generateOfflineId } from "@/lib/offline-store";
import type { CartItem } from "./pos-client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPaid: (saleId: string) => void;
  cart: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  promptpayId: string;
  shopName: string;
  customerId: string | null;
  pointsRedeemed: number;
  pointsDiscount: number;
};

export function PaymentDialog(props: Props) {
  const t = useTranslations("payment");
  const tc = useTranslations("common");
  const { open, onOpenChange, onPaid, cart, subtotal, discount, total, promptpayId, customerId, pointsRedeemed, pointsDiscount } = props;

  const [method, setMethod] = useState<"CASH" | "PROMPTPAY">("CASH");
  const [paid, setPaid] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paidNum = Number(paid) || 0;
  const change = method === "CASH" ? Math.max(0, paidNum - total) : 0;
  const enough = method === "CASH" ? paidNum >= total : true;

  // Quick cash amounts
  const quickAmounts = [total, roundUp(total, 20), roundUp(total, 50), roundUp(total, 100), 500, 1000];
  const uniqueQuick = Array.from(new Set(quickAmounts)).filter((n) => n >= total);

  useEffect(() => {
    if (!open) {
      setMethod("CASH");
      setPaid("");
      setQrDataUrl(null);
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (method !== "PROMPTPAY" || !open) return;
    if (!promptpayId) {
      setError("PromptPay ID not set. Please configure in Settings.");
      return;
    }
    setQrDataUrl(null);
    fetch("/api/promptpay-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    })
      .then((r) => r.json())
      .then((d) => setQrDataUrl(d.dataUrl))
      .catch(() => setError("Failed to generate QR"));
  }, [method, total, promptpayId, open]);

  async function confirm() {
    setError(null);
    setLoading(true);

    const salePayload = {
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      discount,
      paymentMethod: method,
      paidAmount: method === "CASH" ? paidNum : total,
      customerId: customerId || undefined,
      pointsRedeemed: pointsRedeemed || 0,
    };

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salePayload),
      });
      setLoading(false);
      if (!res.ok) {
        setError(await res.text());
        return;
      }
      const sale = await res.json();
      onPaid(sale.id);
    } catch (networkErr) {
      // Network error — save to offline queue
      setLoading(false);
      try {
        const offlineId = generateOfflineId();
        await addOfflineSale({
          id: offlineId,
          payload: salePayload as any,
          createdAt: new Date().toISOString(),
          synced: false,
        });
        // Notify offline indicator
        window.dispatchEvent(new CustomEvent("offlineSaleQueued"));
        onPaid(offlineId);
      } catch (dbErr) {
        setError("Failed to save offline sale. Please try again.");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="text-sm text-muted-foreground">{t("totalToPay")}</div>
            <div className="text-3xl font-bold">{formatMoney(total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Subtotal {formatMoney(subtotal)} {discount > 0 && `− Discount ${formatMoney(discount)}`} {pointsDiscount > 0 && `− Points ${formatMoney(pointsDiscount)}`}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("CASH")}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors",
                method === "CASH" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <Banknote className="h-6 w-6" />
              <span className="text-sm font-medium">{t("cash")}</span>
            </button>
            <button
              onClick={() => setMethod("PROMPTPAY")}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors",
                method === "PROMPTPAY" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <QrCode className="h-6 w-6" />
              <span className="text-sm font-medium">{t("promptpay")}</span>
            </button>
          </div>

          {method === "CASH" && (
            <div className="space-y-2">
              <Label>{t("received")}</Label>
              <Input
                type="number"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
                className="text-2xl h-14 text-right"
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {uniqueQuick.slice(0, 5).map((amt) => (
                  <Button
                    key={amt}
                    size="sm"
                    variant="outline"
                    onClick={() => setPaid(String(amt))}
                  >
                    {formatMoney(amt)}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">{t("change")}</span>
                <span className={cn("font-bold text-lg", !enough && "text-destructive")}>
                  {enough ? formatMoney(change) : t("insufficient")}
                </span>
              </div>
            </div>
          )}

          {method === "PROMPTPAY" && (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">{t("scanToPay")}</p>
              <div className="flex justify-center">
                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="PromptPay QR" width={256} height={256} className="block" />
                  </div>
                ) : (
                  <div className="h-64 w-64 flex items-center justify-center bg-muted rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("promptpayNote")}</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button onClick={confirm} disabled={loading || !enough}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {method === "CASH" ? tc("confirm") : t("confirmReceived")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function roundUp(n: number, nearest: number) {
  return Math.ceil(n / nearest) * nearest;
}
