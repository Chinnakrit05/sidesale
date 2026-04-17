import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const customerSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  active: z.boolean(),
});

function handleErr(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown";
  if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  try {
    await requireRole("OWNER", "CASHIER");
    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q ? 20 : 500,
    });
    return NextResponse.json(
      customers.map((c: typeof customers[0]) => ({
        ...c,
        totalSpent: c.totalSpent.toString(),
      }))
    );
  } catch (e) {
    return handleErr(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("OWNER", "CASHIER");
    const body = customerSchema.parse(await req.json());
    const customer = await prisma.customer.create({
      data: {
        code: body.code,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        note: body.note || null,
        active: body.active,
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    return handleErr(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole("OWNER");
    const body = customerSchema.parse(await req.json());
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const customer = await prisma.customer.update({
      where: { id: body.id },
      data: {
        code: body.code,
        name: body.name,
        phone: body.phone || null,
        email: body.email || null,
        note: body.note || null,
        active: body.active,
      },
    });
    return NextResponse.json(customer);
  } catch (e) {
    return handleErr(e);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireRole("OWNER");
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const saleCount = await prisma.sale.count({ where: { customerId: id } });
    if (saleCount > 0) {
      await prisma.customer.update({ where: { id }, data: { active: false } });
      return NextResponse.json({ ok: true, softDeleted: true });
    }
    await prisma.customer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleErr(e);
  }
}
