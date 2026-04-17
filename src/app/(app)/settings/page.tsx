import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireRole("OWNER");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  return (
    <SettingsClient
      initial={{
        shopName: settings?.shopName || "",
        promptpayId: settings?.promptpayId || "",
        currency: settings?.currency || "THB",
        taxRate: String(settings?.taxRate || "0"),
        pointsPerBaht: String(settings?.pointsPerBaht ?? "1"),
        pointValue: String(settings?.pointValue ?? "0.25"),
        minPointsRedeem: String(settings?.minPointsRedeem ?? "100"),
      }}
    />
  );
}
