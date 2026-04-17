import { prisma } from "@/lib/prisma";

type AuditParams = {
  entity: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
};

export async function logAudit({ entity, entityId, action, userId, userName, before, after }: AuditParams) {
  let changes: string | null = null;

  if (action === "update" && before && after) {
    const diff: Record<string, { from: any; to: any }> = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (["updatedAt", "createdAt", "id"].includes(key)) continue;
      const oldVal = String(before[key] ?? "");
      const newVal = String(after[key] ?? "");
      if (oldVal !== newVal) {
        diff[key] = { from: before[key], to: after[key] };
      }
    }
    if (Object.keys(diff).length > 0) {
      changes = JSON.stringify(diff);
    }
  } else if (action === "create" && after) {
    changes = JSON.stringify(after);
  } else if (action === "delete" && before) {
    changes = JSON.stringify(before);
  }

  await prisma.auditLog.create({
    data: { entity, entityId, action, changes, userId, userName },
  });
}
