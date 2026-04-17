"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus, Search, ImagePlus, X, Upload, Download } from "lucide-react";
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
import { formatMoney, cn } from "@/lib/utils";

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
};

export type ProductRow = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  unit: string;
  price: string;
  cost: string;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
};

const UNIT_OPTIONS = ["piece", "kg", "g", "bottle", "pack", "bag", "box", "can", "set", "pair", "meter", "liter", "ml"];

type FormState = {
  id?: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  unit: string;
  price: string;
  cost: string;
  stock: string;
  lowStockThreshold: string;
  active: boolean;
};

const EMPTY: FormState = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  imageUrl: "",
  categoryId: "",
  unit: "piece",
  price: "0",
  cost: "0",
  stock: "0",
  lowStockThreshold: "5",
  active: true,
};

export function ProductsClient({ initial, categories }: { initial: ProductRow[]; categories: CategoryOption[] }) {
  const t = useTranslations("products");
  const tc = useTranslations("common");
  const tu = useTranslations("units");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const filtered = items.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setForm({ ...EMPTY, sku: suggestSku(items) });
    setOpen(true);
  }

  function openEdit(p: ProductRow) {
    setForm({
      id: p.id,
      sku: p.sku,
      barcode: p.barcode || "",
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      categoryId: p.categoryId || "",
      unit: p.unit || "piece",
      price: p.price,
      cost: p.cost,
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      active: p.active,
    });
    setOpen(true);
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  async function handleImport(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Import failed");
        return;
      }
      setImportResult({ created: data.created, updated: data.updated, errors: data.errors || [] });
      const r = await fetch("/api/products").then((r) => r.json());
      setItems(r);
      start(() => router.refresh());
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    window.open("/api/products/export", "_blank");
  }

  async function save() {
    const payload = {
      id: form.id,
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      categoryId: form.categoryId || null,
      unit: form.unit || "piece",
      price: Number(form.price),
      cost: Number(form.cost),
      stock: parseInt(form.stock, 10),
      lowStockThreshold: parseInt(form.lowStockThreshold, 10),
      active: form.active,
    };
    const res = await fetch("/api/products", {
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
    const r = await fetch("/api/products").then((r) => r.json());
    setItems(r);
  }

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    setItems(items.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold font-display">{t("title")}</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">{t("export")}</span>
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild disabled={importing}>
              <span>
                <Upload className="h-4 w-4" /> <span className="hidden sm:inline">{importing ? t("importing") : t("import")}</span>
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImport(f);
                e.target.value = "";
              }}
            />
          </label>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4" /> {t("addProduct")}
          </Button>
        </div>
      </div>

      {importResult && (
        <div className="rounded-2xl p-4 text-sm bg-surface-low">
          <div className="font-medium">
            {t("importResult", { created: importResult.created, updated: importResult.updated })}
          </div>
          {importResult.errors.length > 0 && (
            <div className="mt-2 text-destructive text-xs space-y-0.5">
              {importResult.errors.slice(0, 10).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
              {importResult.errors.length > 10 && (
                <div>...and {importResult.errors.length - 10} more errors</div>
              )}
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-primary mt-1 hover:underline">
            {t("dismissResult")}
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
        <Input
          placeholder={tc("search")}
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-2">
        {filtered.map((p) => (
          <Card key={p.id} className="bg-surface-lowest p-3">
            <div className="flex items-center gap-3">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                  {p.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm line-clamp-1">{p.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="font-bold text-sm text-on-primary-container">{formatMoney(p.price)}</span>
                  <span className={cn("text-xs", p.stock <= p.lowStockThreshold ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {t("stock")}: {p.stock}
                  </span>
                  {!p.active && (
                    <span className="rounded-full px-2 py-0.5 text-[10px] bg-muted text-muted-foreground">{tc("no")}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(p.id)}>
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
      <Card className="hidden sm:block overflow-x-auto bg-surface-lowest">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 w-12"></th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("sku")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("name")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("price")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("stock")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden md:table-cell">{t("active")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, idx) => (
              <tr key={p.id} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                <td className="p-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">
                  <div className="font-medium">{p.name}</div>
                  {p.barcode && (
                    <div className="text-xs text-muted-foreground font-mono">{p.barcode}</div>
                  )}
                </td>
                <td className="p-3 text-right font-bold text-on-primary-container">{formatMoney(p.price)}</td>
                <td className={cn("p-3 text-right", p.stock <= p.lowStockThreshold && "text-destructive font-semibold")}>
                  {p.stock} <span className="text-xs text-muted-foreground font-normal">{tu(p.unit || "piece")}</span>
                </td>
                <td className="p-3 hidden md:table-cell">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs",
                      p.active ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {p.active ? tc("yes") : tc("no")}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
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
            <DialogTitle>{form.id ? t("editProduct") : t("addProduct")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("sku")}</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("barcode")}</Label>
              <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("image")}</Label>
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  <div className="relative">
                    <img src={form.imageUrl} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, imageUrl: "" })}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label
                    className={cn(
                      "w-20 h-20 rounded-xl ghost-border flex flex-col items-center justify-center cursor-pointer",
                      "hover:bg-accent/50 transition-all",
                      uploading && "opacity-50 pointer-events-none"
                    )}
                  >
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">
                      {uploading ? t("uploading") : t("upload")}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("category")}</Label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-9 rounded-[1.5rem] bg-surface-lowest ghost-border px-4 text-sm transition-shadow focus:ring-2 focus:ring-ring/40 focus:outline-none"
              >
                <option value="">{t("noCategory")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>{t("unit")}</Label>
              <div className="flex gap-1.5 flex-wrap">
                {UNIT_OPTIONS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm({ ...form, unit: u })}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-semibold transition-all",
                      form.unit === u
                        ? "btn-gradient text-primary-foreground"
                        : "bg-surface-low text-muted-foreground hover:bg-surface-high"
                    )}
                  >
                    {tu(u)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("price")}/{tu(form.unit)}</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("cost")}/{tu(form.unit)}</Label>
              <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("stock")}</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("lowStockThreshold")}</Label>
              <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="active">{t("active")}</Label>
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

function suggestSku(items: ProductRow[]) {
  const nums = items
    .map((p) => parseInt(p.sku.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `P-${String(next).padStart(4, "0")}`;
}
