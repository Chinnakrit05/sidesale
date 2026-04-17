"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Wifi, WifiOff, CloudUpload, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPendingSales, syncPendingSales } from "@/lib/offline-store";

export function OfflineIndicator() {
  const t = useTranslations("offline");
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  const checkPending = useCallback(async () => {
    try {
      const pending = await getPendingSales();
      setPendingCount(pending.length);
    } catch {
      // IndexedDB not available
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => {
      setOnline(true);
      checkPending();
    };
    const goOffline = () => {
      setOnline(false);
      setSyncResult(null);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Check pending sales periodically
    checkPending();
    const interval = setInterval(checkPending, 10_000);

    // Listen for custom events from POS
    const handleSaleQueued = () => checkPending();
    window.addEventListener("offlineSaleQueued", handleSaleQueued);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("offlineSaleQueued", handleSaleQueued);
      clearInterval(interval);
    };
  }, [checkPending]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && pendingCount > 0) {
      handleSync();
    }
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSync() {
    if (syncing || !online || pendingCount === 0) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncPendingSales();
      setSyncResult(result);
      await checkPending();
      // Clear result after 5 sec
      setTimeout(() => setSyncResult(null), 5000);
    } finally {
      setSyncing(false);
    }
  }

  // Only show when offline or when there are pending sales
  if (online && pendingCount === 0 && !syncResult) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-2xl shadow-ambient-lg p-3 max-w-xs animate-in slide-in-from-bottom-2",
        !online
          ? "bg-amber-50 dark:bg-amber-950"
          : syncResult?.failed
          ? "bg-red-50 dark:bg-red-950"
          : "bg-surface-lowest"
      )}
    >
      <div className="flex items-center gap-2">
        {!online ? (
          <>
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("offline")}</div>
              <div className="text-xs text-amber-600 dark:text-amber-400">{t("offlineHint")}</div>
              {pendingCount > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-medium">
                  {t("pending", { count: pendingCount })}
                </div>
              )}
            </div>
          </>
        ) : syncResult ? (
          <>
            {syncResult.failed > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            ) : (
              <Check className="h-4 w-4 text-green-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">
                {syncResult.failed > 0
                  ? t("syncPartial", { synced: syncResult.synced, failed: syncResult.failed })
                  : t("syncSuccess", { count: syncResult.synced })}
              </div>
            </div>
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudUpload className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{t("pending", { count: pendingCount })}</div>
            </div>
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="shrink-0">
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : t("syncNow")}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
