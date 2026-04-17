import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const schema = z.object({
  shopName: z.string().min(1),
  promptpayId: z.string(),
  currency: z.string().min(1),
  taxRate: z.number().min(0).max(100),
  pointsPerBaht: z.number().int().min(0).default(1),
  pointValue: z.number().min(0).default(0.25),
  minPointsRedeem: z.number().int().min(0).default(100),
});

export async function PUT(req: Request) {
  try {
    await requireRole("OWNER");
    const body = schema.parse(await req.json());
    await prisma.settings.upsert({
      where: { id: 1 },
      update: body,
      create: { id: 1, ...body },
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
