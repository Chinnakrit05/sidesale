"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "CASHIER";
  active: boolean;
  createdAt: string;
};

type Form = { id?: string; name: string; email: string; password: string; role: "OWNER" | "CASHIER"; active: boolean };
const EMPTY: Form = { name: "", email: "", password: "", role: "CASHIER", active: true };

export function StaffClient({ initial }: { initial: Staff[] }) {
  const t = useTranslations("staff");
  const tc = useTranslations("common");
  const tRole = useTranslations("role");
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);

  function openCreate() { setForm(EMPTY); setOpen(true); }
  function openEdit(s: Staff) {
    setForm({ id: s.id, name: s.name, email: s.email, password: "", role: s.role, active: s.active });
    setOpen(true);
  }

  async function save() {
    setLoading(true);
    const res = await fetch("/api/staff", {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) { alert(await res.text()); return; }
    setOpen(false);
    const r = await fetch("/api/staff").then((r) => r.json());
    setItems(r);
  }

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
    setItems(items.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold font-display">{t("title")}</h1>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4" strokeWidth={2} /> {t("addStaff")}</Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("name")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">{t("email")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider">{t("role")}</th>
              <th className="p-3 text-muted-foreground font-medium text-xs uppercase tracking-wider hidden sm:table-cell">{t("active")}</th>
              <th className="p-3 text-right text-muted-foreground font-medium text-xs uppercase tracking-wider">{tc("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, idx) => (
              <tr key={s.id} className={idx % 2 === 0 ? "bg-surface-low/40" : ""}>
                <td className="p-3">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground sm:hidden">{s.email}</div>
                </td>
                <td className="p-3 hidden sm:table-cell">{s.email}</td>
                <td className="p-3">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-xs",
                    s.role === "OWNER" ? "bg-violet-500/15 text-violet-700 dark:text-violet-400" : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                  )}>
                    {tRole(s.role)}
                  </span>
                </td>
                <td className="p-3 hidden sm:table-cell">
                  <span className={cn(
                    "inline-block rounded-full px-2 py-0.5 text-xs",
                    s.active ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}>
                    {s.active ? tc("yes") : tc("no")}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? t("editStaff") : t("addStaff")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("name")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("email")}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("password")} {form.id && <span className="text-xs text-muted-foreground">({t("passwordHint")})</span>}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("role")}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "OWNER" | "CASHIER" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">{tRole("OWNER")}</SelectItem>
                  <SelectItem value="CASHIER">{tRole("CASHIER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="staff-active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="staff-active">{t("active")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={save} disabled={loading}>{tc("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
