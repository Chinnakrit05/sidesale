"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus, Search, Star, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { formatMoney, formatDate, cn } from "@/lib/utils";

type CustomerRow = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  points: number;
  totalSpent: string;
  visitCount: number;
  note: string | null;
  active: boolean;
  createdAt: string;
};

type FormState = {
  id?: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  active: boolean;
};

type PointEntry = {
  id: string;
  change: number;
  balance: number;
  reason: string;
  createdAt: string;
};

const EMPTY: FormState = { code: "", name: "", phone: "", email: "", note: "", active: true };

export function CustomersClient({ initial }: { initial: CustomerRow[] }) {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, start] = useTransition();

  // Points dialog
  const [pointsOpen, setPointsOpen] = useState(false);
  const [pointsCustomer, setPointsCustomer] = useState<CustomerRow | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointEntry[]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const filtered = items.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  function suggestCode() {
    const nums = items.map((c) => parseInt(c.code.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    return `M-${String(next).padStart(4, "0")}`;
  }

  function openCreate() {
    setForm({ ...EMPTY, code: suggestCode() });
    setOpen(true);
  }

  function openEdit(c: CustomerRow) {
    setForm({
      id: c.id,
      code: c.code,
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      note: c.note || "",
      active: c.active,
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      id: form.id,
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      note: form.note.trim() || null,
      active: form.active,
    };
    const res = await fetch("/api/customers", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Error");
      return;
    }
    setOpen(false);
    start(() => router.refresh());
    const r = await fetch("/api/customers").then((r) => r.json());
    setItems(r);
  }

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setItems(items.filter((c) => c.id !== id));
  }

  async function openPoints(c: CustomerRow) {
    setPointsCustomer(c);
    setAdjustAmount("");
    setAdjustReason("");
    setPointsOpen(true);
    const res = await fetch(`/api/customers/${c.id}/points`);
    if (res.ok) {
      setPointsHistory(await res.json());
    }
  }

  async function adjustPoints() {
    if (!pointsCustomer || !adjustAmount || !adjustReason.trim()) return;
    const res = await fetch(`/api/customers/${pointsCustomer.id}/points`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change: parseInt(adjustAmount, 10), reason: adjustReason.trim() }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Error");
      return;
    }
    const data = await res.json();
    setPointsCustomer({ ...pointsCustomer, points: data.points });
    setItems(items.map((c) => (c.id === pointsCustomer.id ? { ...c, points: data.points } : c)));
    setAdjustAmount("");
    setAdjustReason("");
    // Refresh history
    const hRes = await fetch(`/api/customers/${pointsCustomer.id}/points`);
    if (hRes.ok) setPointsHistory(await hRes.json());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold font-display">{t("title")}</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" /> {t("addCustomer")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tc("search")}
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {filtered.map((c) => (
          <Card key={c.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.phone || "—"}</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                    <Star className="h-3 w-3" /> {c.points.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatMoney(c.totalSpent)}</span>
                  <span className="text-xs text-muted-foreground">{c.visitCount} visits</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openPoints(c)}>
                  <History className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-8">{tc("noData")}</div>
        )}
      </div>

      {/* Desktop/iPad table view */}
      <Card className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("code")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("name")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">{t("phone")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("points")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">{t("totalSpent")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider hidden lg:table-cell">{t("visits")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={c.id} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                <td className="p-3 font-mono text-xs">{c.code}</td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{c.phone || "—"}</td>
                <td className="p-3 text-right">
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                    <Star className="h-3 w-3" /> {c.points.toLocaleString()}
                  </span>
                </td>
                <td className="p-3 text-right hidden md:table-cell">{formatMoney(c.totalSpent)}</td>
                <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{c.visitCount}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openPoints(c)} title={t("pointHistory")}>
                      <History className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">{tc("noData")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("editCustomer") : t("addCustomer")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("code")}</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("phone")}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="08x-xxx-xxxx" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("email")}</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("note")}</Label>
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="cust-active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="cust-active">{t("active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={save} disabled={pending}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Points History Dialog */}
      <Dialog open={pointsOpen} onOpenChange={setPointsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("pointHistory")} — {pointsCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-2">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2">
              <Star className="h-6 w-6" /> {pointsCustomer?.points.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">{t("currentPoints")}</div>
          </div>

          {/* Manual adjust */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{t("adjustAmount")}</Label>
              <Input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} placeholder="+100 / -50" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">{t("adjustReason")}</Label>
              <Input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
            </div>
            <Button size="sm" onClick={adjustPoints} disabled={!adjustAmount || !adjustReason.trim()}>
              {t("adjust")}
            </Button>
          </div>

          {/* History table */}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="text-left">
                  <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("date")}</th>
                  <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("change")}</th>
                  <th className="p-2 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("balance")}</th>
                  <th className="p-2 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("reason")}</th>
                </tr>
              </thead>
              <tbody>
                {pointsHistory.map((h, idx) => (
                  <tr key={h.id} className={`text-xs ${idx % 2 === 0 ? "bg-surface-low/40" : ""}`}>
                    <td className="p-2 text-muted-foreground whitespace-nowrap">{formatDate(h.createdAt)}</td>
                    <td className={cn("p-2 text-right font-semibold", h.change > 0 ? "text-green-600" : "text-red-500")}>
                      {h.change > 0 ? `+${h.change}` : h.change}
                    </td>
                    <td className="p-2 text-right">{h.balance}</td>
                    <td className="p-2 text-muted-foreground">{h.reason}</td>
                  </tr>
                ))}
                {pointsHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted-foreground">{tc("noData")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
