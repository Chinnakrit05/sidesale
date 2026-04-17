import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { StaffClient } from "./staff-client";

export default async function StaffPage() {
  await requireRole("OWNER");
  const staff = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  return <StaffClient initial={staff.map((s: typeof staff[0]) => ({ ...s, createdAt: s.createdAt.toISOString() }))} />;
}
