import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  await requireRole("OWNER");
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
  return (
    <CustomersClient
      initial={customers.map((c: typeof customers[0]) => ({
        ...c,
        totalSpent: c.totalSpent.toString(),
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
