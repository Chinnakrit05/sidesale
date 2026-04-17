import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { AuditClient } from "./audit-client";

export default async function AuditPage() {
  await requireRole("OWNER");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <AuditClient
      initial={logs.map((l: typeof logs[0]) => ({
        id: l.id,
        entity: l.entity,
        entityId: l.entityId,
        action: l.action,
        changes: l.changes,
        userName: l.userName,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
