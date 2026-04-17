"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { formatDate, cn } from "@/lib/utils";

type LogRow = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  changes: string | null;
  userName: string;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-500/15 text-green-700 dark:text-green-400",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400",
  void: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  import: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
};

export function AuditClient({ initial }: { initial: LogRow[] }) {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? initial.filter((l) => l.action === filter) : initial;
  const actions = [...new Set(initial.map((l) => l.action))];

  function renderChanges(changes: string) {
    try {
      const parsed = JSON.parse(changes);
      // If it's a diff (update), show field-level changes
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        const entries = Object.entries(parsed);
        // Check if it's update diff format {field: {from, to}}
        const isDiff = entries.some(
          ([, v]: [string, any]) => v && typeof v === "object" && "from" in v && "to" in v
        );
        if (isDiff) {
          return (
            <div className="space-y-1">
              {entries.map(([key, val]: [string, any]) => (
                <div key={key} className="text-xs">
                  <span className="font-medium text-foreground">{key}:</span>{" "}
                  <span className="text-red-500 line-through">{String(val.from ?? "—")}</span>
                  {" → "}
                  <span className="text-green-600">{String(val.to ?? "—")}</span>
                </div>
              ))}
            </div>
          );
        }
        // Create/delete snapshot
        return (
          <div className="space-y-0.5">
            {entries.map(([key, val]: [string, any]) => (
              <div key={key} className="text-xs">
                <span className="font-medium text-foreground">{key}:</span>{" "}
                <span className="text-muted-foreground">{String(val ?? "—")}</span>
              </div>
            ))}
          </div>
        );
      }
    } catch {
      // fallback
    }
    return <pre className="text-xs whitespace-pre-wrap text-muted-foreground">{changes}</pre>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold font-display">{t("title")}</h1>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
            !filter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
          )}
        >
          {tc("all")}
        </button>
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(filter === a ? null : a)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              filter === a ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-accent"
            )}
          >
            {t(`action_${a}`, { fallback: a })}
          </button>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("date")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("user")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("action")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("entity")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l, idx) => (
              <tr key={l.id} className={`align-top ${idx % 2 === 0 ? "bg-surface-low/40" : ""}`}>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(l.createdAt)}
                </td>
                <td className="p-3 whitespace-nowrap">{l.userName}</td>
                <td className="p-3">
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs", ACTION_COLORS[l.action] || "bg-muted")}>
                    {t(`action_${l.action}`, { fallback: l.action })}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-xs font-medium">{l.entity}</span>
                  <span className="text-xs text-muted-foreground ml-1 font-mono">{l.entityId.slice(0, 8)}</span>
                </td>
                <td className="p-3">
                  {l.changes ? (
                    <div>
                      <button
                        onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        {expanded === l.id ? t("hideChanges") : t("showChanges")}
                      </button>
                      {expanded === l.id && (
                        <div className="mt-2 p-2 bg-surface-low rounded-xl">
                          {renderChanges(l.changes)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {tc("noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
