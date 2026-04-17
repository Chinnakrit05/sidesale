import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { ReceiptClient } from "./receipt-client";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const { id } = await params;
  const [sale, settings] = await Promise.all([
    prisma.sale.findUnique({
      where: { id },
      include: { items: true, cashier: true, customer: true },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!sale) notFound();

  // IDOR protection: cashiers can only see their own receipts
  if (session.role !== "OWNER" && sale.cashierId !== session.id) {
    notFound();
  }

  return (
    <ReceiptClient
      sale={{
        id: sale.id,
        number: sale.number,
        createdAt: sale.createdAt.toISOString(),
        cashierName: sale.cashier.name,
        customerName: sale.customer?.name || null,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        voidReason: sale.voidReason,
        voidAt: sale.voidAt?.toISOString() || null,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        total: Number(sale.total),
        paidAmount: Number(sale.paidAmount),
        change: Number(sale.change),
        pointsEarned: sale.pointsEarned,
        pointsRedeemed: sale.pointsRedeemed,
        items: sale.items.map((i: typeof sale.items[0]) => ({
          name: i.name,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        })),
      }}
      shopName={settings?.shopName || "SideSale"}
      userRole={session.role as string}
    />
  );
}
