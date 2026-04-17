import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    await requireRole("OWNER");
    const url = new URL(req.url);
    const entity = url.searchParams.get("entity") || undefined;
    const entityId = url.searchParams.get("entityId") || undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);

    const logs = await prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(
      logs.map((l: typeof logs[0]) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
