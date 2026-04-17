import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { generateSaleNumber } from "@/lib/utils";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const schema = z.object({
  items: z.array(
    z.object({ productId: z.string(), quantity: z.number().int().positive() })
  ).min(1),
  discount: z.number().nonnegative().default(0),
  paymentMethod: z.enum(["CASH", "PROMPTPAY"]),
  paidAmount: z.number().nonnegative(),
  note: z.string().optional(),
  customerId: z.string().optional(),
  pointsRedeemed: z.number().int().nonnegative().default(0),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limited = rateLimitResponse(`sales:${ip}`, RATE_LIMITS.api);
    if (limited) return limited;

    const user = await requireUser();
    const body = schema.parse(await req.json());

    const result = await prisma.$transaction(async (tx: any) => {
      const products: any[] = await tx.product.findMany({
        where: { id: { in: body.items.map((i: any) => i.productId) } },
      });
      const map = new Map(products.map((p: any) => [p.id, p]));

      let subtotal = 0;
      const itemsData: {
        productId: string;
        name: string;
        unit: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
      }[] = [];

      for (const i of body.items) {
        const p: any = map.get(i.productId);
        if (!p) throw new Error(`Product not found: ${i.productId}`);
        if (p.stock < i.quantity) throw new Error(`Insufficient stock for ${p.name}`);
        const unitPrice = Number(p.price);
        const sub = unitPrice * i.quantity;
        subtotal += sub;
        itemsData.push({
          productId: p.id,
          name: p.name,
          unit: p.unit || "piece",
          unitPrice,
          quantity: i.quantity,
          subtotal: sub,
        });
      }

      const discount = Math.min(body.discount, subtotal);

      // Points redemption
      let pointsRedeemed = 0;
      let pointsDiscount = 0;
      let customer: any = null;
      const settings = await tx.settings.findUnique({ where: { id: 1 } });
      const pointValue = settings ? Number(settings.pointValue) : 0.25;
      const pointsPerBaht = settings?.pointsPerBaht ?? 1;
      const minPointsRedeem = settings?.minPointsRedeem ?? 100;

      if (body.customerId) {
        customer = await tx.customer.findUnique({ where: { id: body.customerId } });
        if (!customer) throw new Error("Customer not found");
        if (body.pointsRedeemed > 0) {
          if (body.pointsRedeemed > customer.points) throw new Error("Insufficient points");
          if (body.pointsRedeemed < minPointsRedeem) throw new Error(`Minimum redeem is ${minPointsRedeem} points`);
          pointsRedeemed = body.pointsRedeemed;
          pointsDiscount = pointsRedeemed * pointValue;
        }
      }

      const total = Math.max(0, subtotal - discount - pointsDiscount);
      if (body.paymentMethod === "CASH" && body.paidAmount < total) {
        throw new Error("Insufficient paid amount");
      }
      const change = body.paymentMethod === "CASH" ? body.paidAmount - total : 0;

      // Calculate points earned (based on total paid)
      const pointsEarned = customer ? Math.floor(total * pointsPerBaht) : 0;

      const sale = await tx.sale.create({
        data: {
          number: generateSaleNumber(),
          cashierId: user.id,
          customerId: body.customerId || null,
          subtotal,
          discount,
          total,
          paymentMethod: body.paymentMethod,
          paidAmount: body.paymentMethod === "CASH" ? body.paidAmount : total,
          change,
          note: body.note,
          pointsEarned,
          pointsRedeemed,
          items: {
            create: itemsData,
          },
        },
      });

      // Update customer: points balance, totalSpent, visitCount
      if (customer) {
        const netPoints = pointsEarned - pointsRedeemed;
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            points: { increment: netPoints },
            totalSpent: { increment: total },
            visitCount: { increment: 1 },
          },
        });

        // Log point history entries
        if (pointsRedeemed > 0) {
          const newBalanceAfterRedeem = customer.points - pointsRedeemed;
          await tx.pointHistory.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              change: -pointsRedeemed,
              balance: newBalanceAfterRedeem,
              reason: `redeem: Sale #${sale.number}`,
            },
          });
        }
        if (pointsEarned > 0) {
          const newBalanceFinal = customer.points - pointsRedeemed + pointsEarned;
          await tx.pointHistory.create({
            data: {
              customerId: customer.id,
              saleId: sale.id,
              change: pointsEarned,
              balance: newBalanceFinal,
              reason: `earn: Sale #${sale.number}`,
            },
          });
        }
      }

      // decrement stock & log movement
      for (const i of body.items) {
        await tx.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: i.productId,
            type: "OUT",
            quantity: i.quantity,
            reason: `Sale ${sale.number}`,
            userId: user.id,
          },
        });
      }

      return sale;
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
