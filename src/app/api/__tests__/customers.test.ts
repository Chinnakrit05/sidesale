import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockPrismaCustomer, mockPrismaSale } = vi.hoisted(() => ({
  mockPrismaCustomer: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  mockPrismaSale: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: mockPrismaCustomer,
    sale: mockPrismaSale,
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}));

import { GET, POST, PUT, DELETE } from "../../api/customers/route";
import { requireRole } from "@/lib/rbac";

// ---------- helpers ----------

const OWNER = { id: "u1", name: "Owner", role: "OWNER" };
const CASHIER = { id: "u2", name: "Staff", role: "CASHIER" };

function makeCustomer(overrides: Record<string, any> = {}) {
  return {
    id: "cust1",
    code: "C001",
    name: "Alice",
    phone: "0812345678",
    email: null,
    note: null,
    points: 200,
    totalSpent: 5000,
    visitCount: 10,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function jsonReq(body: any, method = "POST", urlSuffix = "") {
  return new Request(`http://localhost/api/customers${urlSuffix}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireRole as any).mockResolvedValue(OWNER);
});

describe("GET /api/customers", () => {
  it("returns customers with totalSpent as string", async () => {
    const cust = makeCustomer();
    mockPrismaCustomer.findMany.mockResolvedValue([cust]);

    const req = new Request("http://localhost/api/customers");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].totalSpent).toBe("5000");
  });

  it("passes search query to prisma", async () => {
    mockPrismaCustomer.findMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/customers?q=alice");
    await GET(req);

    const callArg = mockPrismaCustomer.findMany.mock.calls[0][0];
    expect(callArg.where.OR).toBeDefined();
    expect(callArg.take).toBe(20);
  });

  it("returns up to 500 when no query", async () => {
    mockPrismaCustomer.findMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/customers");
    await GET(req);

    const callArg = mockPrismaCustomer.findMany.mock.calls[0][0];
    expect(callArg.take).toBe(500);
  });

  it("returns 401 when unauthenticated", async () => {
    (requireRole as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const req = new Request("http://localhost/api/customers");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/customers", () => {
  it("creates a customer", async () => {
    const created = makeCustomer();
    mockPrismaCustomer.create.mockResolvedValue(created);

    const body = { code: "C001", name: "Alice", active: true };
    const res = await POST(jsonReq(body));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("cust1");
    expect(mockPrismaCustomer.create).toHaveBeenCalledOnce();
  });

  it("allows CASHIER to create", async () => {
    (requireRole as any).mockResolvedValue(CASHIER);
    mockPrismaCustomer.create.mockResolvedValue(makeCustomer());

    const body = { code: "C002", name: "Bob", active: true };
    const res = await POST(jsonReq(body));
    expect(res.status).toBe(200);
  });

  it("returns 400 for invalid body (missing code)", async () => {
    const body = { name: "Alice", active: true };
    const res = await POST(jsonReq(body));
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/customers", () => {
  it("updates customer", async () => {
    const updated = makeCustomer({ name: "Alice Updated" });
    mockPrismaCustomer.update.mockResolvedValue(updated);

    const body = { id: "cust1", code: "C001", name: "Alice Updated", active: true };
    const res = await PUT(jsonReq(body, "PUT"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Alice Updated");
  });

  it("returns 400 when id missing", async () => {
    const body = { code: "C001", name: "Alice", active: true };
    const res = await PUT(jsonReq(body, "PUT"));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("id required");
  });

  it("returns 403 when cashier tries to update", async () => {
    (requireRole as any).mockRejectedValue(new Error("FORBIDDEN"));
    const body = { id: "cust1", code: "C001", name: "Alice", active: true };
    const res = await PUT(jsonReq(body, "PUT"));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/customers", () => {
  it("hard deletes when no sales reference", async () => {
    mockPrismaSale.count.mockResolvedValue(0);
    mockPrismaCustomer.delete.mockResolvedValue({});

    const req = new Request("http://localhost/api/customers?id=cust1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.softDeleted).toBeUndefined();
    expect(mockPrismaCustomer.delete).toHaveBeenCalledWith({ where: { id: "cust1" } });
  });

  it("soft deletes when customer has sales", async () => {
    mockPrismaSale.count.mockResolvedValue(5);
    mockPrismaCustomer.update.mockResolvedValue({});

    const req = new Request("http://localhost/api/customers?id=cust1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(data.softDeleted).toBe(true);
    expect(mockPrismaCustomer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } })
    );
  });

  it("returns 400 when id missing", async () => {
    const req = new Request("http://localhost/api/customers", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("id required");
  });
});
