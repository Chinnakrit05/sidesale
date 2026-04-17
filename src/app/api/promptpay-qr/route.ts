import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { generatePromptPayQR } from "@/lib/promptpay";

const schema = z.object({ amount: z.number().positive() });

export async function POST(req: Request) {
  try {
    await requireUser();
    const { amount } = schema.parse(await req.json());
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.promptpayId) {
      return NextResponse.json({ error: "PromptPay ID not set" }, { status: 400 });
    }
    const { dataUrl, payload } = await generatePromptPayQR(settings.promptpayId, amount);
    return NextResponse.json({ dataUrl, payload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
