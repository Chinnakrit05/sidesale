import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

function handleErr(e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown";
  if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ error: msg }, { status: 400 });
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["OWNER", "CASHIER"]),
  active: z.boolean(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(["OWNER", "CASHIER"]),
  active: z.boolean(),
});

export async function GET() {
  try {
    await requireRole("OWNER");
    const staff = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json(staff.map((s: typeof staff[0]) => ({ ...s, createdAt: s.createdAt.toISOString() })));
  } catch (e) { return handleErr(e); }
}

export async function POST(req: Request) {
  try {
    await requireRole("OWNER");
    const body = createSchema.parse(await req.json());
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase().trim(),
        password: await bcrypt.hash(body.password, 12),
        role: body.role,
        active: body.active,
      },
    });
    return NextResponse.json({ id: user.id });
  } catch (e) { return handleErr(e); }
}

export async function PUT(req: Request) {
  try {
    await requireRole("OWNER");
    const body = updateSchema.parse(await req.json());
    const data: Record<string, unknown> = {
      name: body.name,
      email: body.email.toLowerCase().trim(),
      role: body.role,
      active: body.active,
    };
    if (body.password && body.password.length >= 8) {
      data.password = await bcrypt.hash(body.password, 12);
    }
    await prisma.user.update({ where: { id: body.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleErr(e); }
}

export async function DELETE(req: Request) {
  try {
    await requireRole("OWNER");
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    // soft-delete: deactivate
    await prisma.user.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (e) { return handleErr(e); }
}
