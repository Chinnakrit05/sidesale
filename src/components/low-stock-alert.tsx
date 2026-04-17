"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LowStockItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stock: number;
  lowStockThreshold: number;
};

export function LowStockAlert() {
  const t = useTranslations("lowStock");
  const tu = useTranslations("units");
  const [items, setItems] = useState<LowStockItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Check sessionStorage to avoid showing multiple times per session
    const key = "lowstock_dismissed";
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
      return;
    }

    fetch("/api/low-stock")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      })
      .catch(() => {});
  }, []);

  function handleDismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("lowstock_dismissed", "1"); } catch {}
  }

  if (dismissed || items.length === 0) return null;

  const outOfStock = items.filter((i) => i.stock <= 0);
  const lowStock = items.filter((i) => i.stock > 0);
  const showItems = expanded ? items : items.slice(0, 3);

  return (
    <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              {t("title", { count: items.length })}
              {outOfStock.length > 0 && (
                <span className="ml-2 text-destructive font-bold">
                  ({t("outOfStock", { count: outOfStock.length })})
                </span>
              )}
            </h3>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={handleDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="mt-2 space-y-1">
            {showItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 text-xs rounded-xl px-3 py-1.5",
                  item.stock <= 0
                    ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                    : "bg-amber-100/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300"
                )}
              >
                <Package className="h-3 w-3 shrink-0" />
                <span className="font-medium truncate flex-1">{item.name}</span>
                <span className="font-mono text-[11px] whitespace-nowrap">
                  {item.stock <= 0
                    ? t("zeroStock")
                    : t("remaining", { count: item.stock, unit: tu(item.unit || "piece") })}
                </span>
              </div>
            ))}
          </div>

          {items.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1.5"
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" /> {t("showLess")}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" /> {t("showMore", { count: items.length - 3 })}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
