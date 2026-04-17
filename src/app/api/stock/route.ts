import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  productId: z.string(),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.number().int(),
  reason: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireRole("OWNER");
    const body = schema.parse(await req.json());
    const product = await prisma.product.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    let newStock = product.stock;
    if (body.type === "IN") newStock = product.stock + body.quantity;
    if (body.type === "OUT") newStock = product.stock - body.quantity;
    if (body.type === "ADJUST") newStock = body.quantity;
    if (newStock < 0) return NextResponse.json({ error: "Stock cannot go below zero" }, { status: 400 });

    await prisma.$transaction([
      prisma.product.update({
        where: { id: body.productId },
        data: { stock: newStock },
      }),
      prisma.stockMovement.create({
        data: {
          productId: body.productId,
          type: body.type,
          quantity: body.quantity,
          reason: body.reason ?? undefined,
          userId: user.id,
        },
      }),
    ]);
    return NextResponse.json({ ok: true, stock: newStock });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
