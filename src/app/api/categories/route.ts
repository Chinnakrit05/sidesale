import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  color: z.string().min(1),
  sortOrder: z.number().int().nonnegative(),
  active: z.boolean(),
});

function handleErr(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown";
  if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET() {
  try {
    await requireRole("OWNER", "CASHIER");
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json(categories);
  } catch (e) {
    return handleErr(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("OWNER");
    const body = categorySchema.parse(await req.json());
    const category = await prisma.category.create({
      data: {
        name: body.name,
        color: body.color,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    return handleErr(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole("OWNER");
    const body = categorySchema.parse(await req.json());
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const category = await prisma.category.update({
      where: { id: body.id },
      data: {
        name: body.name,
        color: body.color,
        sortOrder: body.sortOrder,
        active: body.active,
      },
    });
    return NextResponse.json(category);
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

    // Unlink products from this category first, then delete
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleErr(e);
  }
}
