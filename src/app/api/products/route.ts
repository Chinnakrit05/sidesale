import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

const productSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  barcode: z.string().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  unit: z.string().min(1).default("piece"),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative(),
  stock: z.number().int(),
  lowStockThreshold: z.number().int().nonnegative(),
  active: z.boolean(),
});

function handleErr(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown";
  if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: msg }, { status: 400 });
}

function toPlain(p: any) {
  return {
    sku: p.sku,
    barcode: p.barcode,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    categoryId: p.categoryId,
    unit: p.unit,
    price: String(p.price),
    cost: String(p.cost),
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    active: p.active,
  };
}

export async function GET() {
  try {
    const session = await requireRole("OWNER", "CASHIER");
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    const isOwner = session.role === "OWNER";
    return NextResponse.json(
      products.map((p: typeof products[0]) => ({
        ...p,
        price: p.price.toString(),
        cost: isOwner ? p.cost.toString() : undefined, // Hide cost from non-owners
        unit: p.unit,
      }))
    );
  } catch (e) {
    return handleErr(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("OWNER");
    const body = productSchema.parse(await req.json());
    const product = await prisma.product.create({
      data: {
        sku: body.sku,
        barcode: body.barcode ?? undefined,
        name: body.name,
        description: body.description ?? undefined,
        imageUrl: body.imageUrl ?? undefined,
        categoryId: body.categoryId ?? undefined,
        unit: body.unit,
        price: body.price,
        cost: body.cost,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        active: body.active,
      },
    });
    await logAudit({
      entity: "product",
      entityId: product.id,
      action: "create",
      userId: session.id,
      userName: session.name || "",
      after: toPlain(product),
    });
    return NextResponse.json(product);
  } catch (e) {
    return handleErr(e);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireRole("OWNER");
    const body = productSchema.parse(await req.json());
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const before = await prisma.product.findUnique({ where: { id: body.id } });
    const product = await prisma.product.update({
      where: { id: body.id },
      data: {
        sku: body.sku,
        barcode: body.barcode ?? null,
        name: body.name,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
        categoryId: body.categoryId ?? null,
        unit: body.unit,
        price: body.price,
        cost: body.cost,
        stock: body.stock,
        lowStockThreshold: body.lowStockThreshold,
        active: body.active,
      },
    });
    if (before) {
      await logAudit({
        entity: "product",
        entityId: product.id,
        action: "update",
        userId: session.id,
        userName: session.name || "",
        before: toPlain(before),
        after: toPlain(product),
      });
    }
    return NextResponse.json(product);
  } catch (e) {
    return handleErr(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireRole("OWNER");
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const before = await prisma.product.findUnique({ where: { id } });

    // If product is referenced by sales, just deactivate.
    const saleCount = await prisma.saleItem.count({ where: { productId: id } });
    if (saleCount > 0) {
      await prisma.product.update({ where: { id }, data: { active: false } });
      if (before) {
        await logAudit({
          entity: "product",
          entityId: id,
          action: "update",
          userId: session.id,
          userName: session.name || "",
          before: toPlain(before),
          after: { ...toPlain(before), active: false },
        });
      }
      return NextResponse.json({ ok: true, softDeleted: true });
    }
    await prisma.product.delete({ where: { id } });
    if (before) {
      await logAudit({
        entity: "product",
        entityId: id,
        action: "delete",
        userId: session.id,
        userName: session.name || "",
        before: toPlain(before),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleErr(e);
  }
}
