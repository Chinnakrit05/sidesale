import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/rbac";

const voidSchema = z.object({
  reason: z.string().min(1, "Void reason is required"),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const session = await requireRole("OWNER");
    const { id } = await ctx.params;
    const body = voidSchema.parse(await req.json());

    // Find the sale
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    if (sale.status === "VOID") {
      return NextResponse.json({ error: "Sale is already voided" }, { status: 400 });
    }

    // Void the sale and restore stock in a transaction
    await prisma.$transaction(async (tx: any) => {
      // Update sale status
      await tx.sale.update({
        where: { id },
        data: {
          status: "VOID",
          voidReason: body.reason,
          voidAt: new Date(),
          voidById: user.id,
        },
      });

      // Reverse points if customer was linked
      if (sale.customerId) {
        const netPoints = sale.pointsEarned - sale.pointsRedeemed;
        if (netPoints !== 0) {
          const cust = await tx.customer.findUnique({ where: { id: sale.customerId } });
          if (cust) {
            const newBalance = cust.points - netPoints;
            await tx.customer.update({
              where: { id: sale.customerId },
              data: {
                points: Math.max(0, newBalance),
                totalSpent: { decrement: Number(sale.total) },
                visitCount: { decrement: 1 },
              },
            });
            await tx.pointHistory.create({
              data: {
                customerId: sale.customerId,
                saleId: sale.id,
                change: -netPoints,
                balance: Math.max(0, newBalance),
                reason: `void: Sale #${sale.number}`,
              },
            });
          }
        }
      }

      // Restore stock for each item
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });

        // Log stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "VOID_RETURN",
            quantity: item.quantity,
            reason: `Void sale #${sale.number}: ${body.reason}`,
            userId: user.id,
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
