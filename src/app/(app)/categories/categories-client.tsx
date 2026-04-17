"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus } from "lucide-react";
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

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  active: boolean;
  _count: { products: number };
};

type FormState = {
  id?: string;
  name: string;
  color: string;
  sortOrder: string;
  active: boolean;
};

const COLORS = [
  "#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

const EMPTY: FormState = { name: "", color: "#6366f1", sortOrder: "0", active: true };

export function CategoriesClient({ initial }: { initial: CategoryRow[] }) {
  const t = useTranslations("categories");
  const tc = useTranslations("common");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, start] = useTransition();

  function openCreate() {
    setForm({ ...EMPTY, sortOrder: String(items.length) });
    setOpen(true);
  }

  function openEdit(c: CategoryRow) {
    setForm({
      id: c.id,
      name: c.name,
      color: c.color,
      sortOrder: String(c.sortOrder),
      active: c.active,
    });
    setOpen(true);
  }

  async function save() {
    const payload = {
      id: form.id,
      name: form.name.trim(),
      color: form.color,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      active: form.active,
    };
    const res = await fetch("/api/categories", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setOpen(false);
    start(() => router.refresh());
    const r = await fetch("/api/categories").then((r) => r.json());
    setItems(r);
  }

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setItems(items.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold font-display">{t("title")}</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" strokeWidth={2} /> {t("addCategory")}
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 w-10"></th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("name")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("productCount")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("active")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, idx) => (
              <tr key={c.id} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                <td className="p-3">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: c.color }} />
                </td>
                <td className="p-3 font-medium">{c.name}</td>
                <td className="p-3 text-right text-muted-foreground">{c._count.products}</td>
                <td className="p-3">
                  <span
                    className={
                      c.active
                        ? "inline-block rounded-full px-2 py-0.5 text-xs bg-green-500/15 text-green-700 dark:text-green-400"
                        : "inline-block rounded-full px-2 py-0.5 text-xs bg-muted text-muted-foreground"
                    }
                  >
                    {c.active ? tc("yes") : tc("no")}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
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
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {tc("noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("editCategory") : t("addCategory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("color")}</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="w-8 h-8 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "white" : "transparent",
                      boxShadow: form.color === c ? `0 0 0 2px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("sortOrder")}</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cat-active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="cat-active">{t("active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={save} disabled={pending}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
