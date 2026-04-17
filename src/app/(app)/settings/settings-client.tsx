"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Settings = {
  shopName: string;
  promptpayId: string;
  currency: string;
  taxRate: string;
  pointsPerBaht: string;
  pointValue: string;
  minPointsRedeem: string;
};

export function SettingsClient({ initial }: { initial: Settings }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        taxRate: Number(form.taxRate),
        pointsPerBaht: Number(form.pointsPerBaht),
        pointValue: Number(form.pointValue),
        minPointsRedeem: Number(form.minPointsRedeem),
      }),
    });
    setLoading(false);
    if (!res.ok) { alert(await res.text()); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold font-display">{t("title")}</h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1">
            <Label>{t("shopName")}</Label>
            <Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{t("promptpayId")}</Label>
            <Input value={form.promptpayId} onChange={(e) => setForm({ ...form, promptpayId: e.target.value })} placeholder="08x-xxx-xxxx" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{t("currency")}</Label>
              <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("taxRate")}</Label>
              <Input type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} />
            </div>
          </div>
          <Button onClick={save} disabled={loading} className="w-full">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? t("saved") : tc("save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("loyaltyTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{t("pointsPerBaht")}</Label>
            <Input type="number" min="0" step="1" value={form.pointsPerBaht} onChange={(e) => setForm({ ...form, pointsPerBaht: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("pointsPerBahtHint")}</p>
          </div>
          <div className="space-y-1">
            <Label>{t("pointValue")}</Label>
            <Input type="number" min="0" step="0.01" value={form.pointValue} onChange={(e) => setForm({ ...form, pointValue: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("pointValueHint")}</p>
          </div>
          <div className="space-y-1">
            <Label>{t("minPointsRedeem")}</Label>
            <Input type="number" min="0" step="1" value={form.minPointsRedeem} onChange={(e) => setForm({ ...form, minPointsRedeem: e.target.value })} />
            <p className="text-xs text-muted-foreground">{t("minPointsRedeemHint")}</p>
          </div>
          <Button onClick={save} disabled={loading} className="w-full">
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? t("saved") : tc("save")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
