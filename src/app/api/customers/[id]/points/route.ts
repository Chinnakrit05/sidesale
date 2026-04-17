import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const adjustSchema = z.object({
  change: z.number().int(),
  reason: z.string().min(1),
});

// GET point history
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await ctx.params;
    const history = await prisma.pointHistory.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(
      history.map((h: typeof history[0]) => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// Manual points adjustment (OWNER only)
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await ctx.params;
    const body = adjustSchema.parse(await req.json());

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const newBalance = customer.points + body.change;
    if (newBalance < 0) {
      return NextResponse.json({ error: "Insufficient points" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.customer.update({
        where: { id },
        data: { points: newBalance },
      }),
      prisma.pointHistory.create({
        data: {
          customerId: id,
          change: body.change,
          balance: newBalance,
          reason: `adjust: ${body.reason}`,
        },
      }),
    ]);

    return NextResponse.json({ points: newBalance });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
