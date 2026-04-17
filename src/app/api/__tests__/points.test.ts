import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockPrismaPointHistory, mockPrismaCustomer } = vi.hoisted(() => ({
  mockPrismaPointHistory: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  mockPrismaCustomer: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pointHistory: mockPrismaPointHistory,
    customer: mockPrismaCustomer,
    $transaction: vi.fn(async (actions: any[]) => {
      for (const action of actions) await action;
    }),
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}));

import { GET, POST } from "../../api/customers/[id]/points/route";
import { requireRole } from "@/lib/rbac";

// ---------- helpers ----------

const OWNER = { id: "u1", name: "Owner", role: "OWNER" };

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body: any) {
  return new Request("http://localhost/api/customers/cust1/points", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------- tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireRole as any).mockResolvedValue(OWNER);
});

describe("GET /api/customers/[id]/points", () => {
  it("returns point history for a customer", async () => {
    const history = [
      { id: "ph1", customerId: "cust1", change: 100, balance: 200, reason: "earn: Sale #S1", createdAt: new Date() },
      { id: "ph2", customerId: "cust1", change: -50, balance: 100, reason: "redeem: Sale #S2", createdAt: new Date() },
    ];
    mockPrismaPointHistory.findMany.mockResolvedValue(history);

    const req = new Request("http://localhost/api/customers/cust1/points");
    const res = await GET(req, makeCtx("cust1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].change).toBe(100);
    expect(data[1].change).toBe(-50);
  });

  it("limits to 100 records", async () => {
    mockPrismaPointHistory.findMany.mockResolvedValue([]);

    const req = new Request("http://localhost/api/customers/cust1/points");
    await GET(req, makeCtx("cust1"));

    const callArg = mockPrismaPointHistory.findMany.mock.calls[0][0];
    expect(callArg.take).toBe(100);
    expect(callArg.orderBy.createdAt).toBe("desc");
  });

  it("returns 400 when unauthenticated", async () => {
    (requireRole as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const req = new Request("http://localhost/api/customers/cust1/points");
    const res = await GET(req, makeCtx("cust1"));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/customers/[id]/points (manual adjust)", () => {
  it("adds points to customer", async () => {
    mockPrismaCustomer.findUnique.mockResolvedValue({ id: "cust1", points: 100 });
    mockPrismaCustomer.update.mockResolvedValue({});
    mockPrismaPointHistory.create.mockResolvedValue({});

    const res = await POST(makeReq({ change: 50, reason: "Birthday bonus" }), makeCtx("cust1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.points).toBe(150);
  });

  it("deducts points from customer", async () => {
    mockPrismaCustomer.findUnique.mockResolvedValue({ id: "cust1", points: 100 });
    mockPrismaCustomer.update.mockResolvedValue({});
    mockPrismaPointHistory.create.mockResolvedValue({});

    const res = await POST(makeReq({ change: -30, reason: "Manual correction" }), makeCtx("cust1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.points).toBe(70);
  });

  it("rejects if result would be negative", async () => {
    mockPrismaCustomer.findUnique.mockResolvedValue({ id: "cust1", points: 10 });

    const res = await POST(makeReq({ change: -50, reason: "Over-deduct" }), makeCtx("cust1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Insufficient points");
  });

  it("returns 404 when customer not found", async () => {
    mockPrismaCustomer.findUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ change: 10, reason: "Test" }), makeCtx("nonexistent"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toContain("Customer not found");
  });

  it("returns 400 for missing reason", async () => {
    const req = new Request("http://localhost/api/customers/cust1/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change: 10 }),
    });
    const res = await POST(req, makeCtx("cust1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-integer change", async () => {
    const req = new Request("http://localhost/api/customers/cust1/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ change: 10.5, reason: "Test" }),
    });
    const res = await POST(req, makeCtx("cust1"));
    expect(res.status).toBe(400);
  });
});
