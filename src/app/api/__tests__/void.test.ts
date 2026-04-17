import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockSale, mockTxSale, mockTxProduct, mockTxCustomer, mockTxStockMovement, mockTxPointHistory, tx } = vi.hoisted(() => {
  const mockTxSale = { update: vi.fn() };
  const mockTxProduct = { update: vi.fn() };
  const mockTxCustomer = { findUnique: vi.fn(), update: vi.fn() };
  const mockTxStockMovement = { create: vi.fn() };
  const mockTxPointHistory = { create: vi.fn() };
  return {
    mockSale: { findUnique: vi.fn() },
    mockTxSale,
    mockTxProduct,
    mockTxCustomer,
    mockTxStockMovement,
    mockTxPointHistory,
    tx: {
      sale: mockTxSale,
      product: mockTxProduct,
      customer: mockTxCustomer,
      stockMovement: mockTxStockMovement,
      pointHistory: mockTxPointHistory,
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sale: mockSale,
    $transaction: vi.fn(async (cb: any) => cb(tx)),
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireUser: vi.fn(),
  requireRole: vi.fn(),
}));

import { POST } from "../../api/sales/[id]/void/route";
import { requireUser, requireRole } from "@/lib/rbac";

// ---------- helpers ----------

const OWNER = { id: "u1", name: "Owner", role: "OWNER" };

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(body: any) {
  return new Request("http://localhost/api/sales/sale1/void", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const saleWithItems = {
  id: "sale1",
  number: "S260417-1234",
  status: "COMPLETED",
  customerId: null,
  pointsEarned: 0,
  pointsRedeemed: 0,
  total: 100,
  items: [
    { productId: "prod1", quantity: 3 },
    { productId: "prod2", quantity: 1 },
  ],
};

// ---------- tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as any).mockResolvedValue(OWNER);
  (requireRole as any).mockResolvedValue(OWNER);
  mockTxSale.update.mockResolvedValue({});
  mockTxProduct.update.mockResolvedValue({});
  mockTxStockMovement.create.mockResolvedValue({});
});

describe("POST /api/sales/[id]/void", () => {
  it("voids a sale and restores stock", async () => {
    mockSale.findUnique.mockResolvedValue(saleWithItems);

    const res = await POST(makeReq({ reason: "Customer changed mind" }), makeCtx("sale1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);

    // Sale updated with VOID status
    expect(mockTxSale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "VOID",
          voidReason: "Customer changed mind",
        }),
      })
    );

    // Stock restored for both items
    expect(mockTxProduct.update).toHaveBeenCalledTimes(2);
    expect(mockTxProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod1" },
        data: { stock: { increment: 3 } },
      })
    );
    expect(mockTxProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod2" },
        data: { stock: { increment: 1 } },
      })
    );

    // Stock movements logged
    expect(mockTxStockMovement.create).toHaveBeenCalledTimes(2);
  });

  it("returns 404 when sale not found", async () => {
    mockSale.findUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ reason: "Test" }), makeCtx("nonexistent"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Sale not found");
  });

  it("returns 400 when sale already voided", async () => {
    mockSale.findUnique.mockResolvedValue({ ...saleWithItems, status: "VOID" });

    const res = await POST(makeReq({ reason: "Test" }), makeCtx("sale1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already voided");
  });

  it("returns 400 for missing reason", async () => {
    mockSale.findUnique.mockResolvedValue(saleWithItems);

    const res = await POST(makeReq({}), makeCtx("sale1"));
    expect(res.status).toBe(400);
  });

  it("reverses points when customer is linked", async () => {
    const saleWithCustomer = {
      ...saleWithItems,
      customerId: "cust1",
      pointsEarned: 100,
      pointsRedeemed: 50,
    };
    mockSale.findUnique.mockResolvedValue(saleWithCustomer);
    mockTxCustomer.findUnique.mockResolvedValue({ id: "cust1", points: 300 });
    mockTxCustomer.update.mockResolvedValue({});
    mockTxPointHistory.create.mockResolvedValue({});

    const res = await POST(makeReq({ reason: "Wrong items" }), makeCtx("sale1"));
    expect(res.status).toBe(200);

    // netPoints = 100 - 50 = 50, so reverse by -50
    // newBalance = 300 - 50 = 250
    expect(mockTxCustomer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: expect.any(Number),
          totalSpent: { decrement: 100 },
          visitCount: { decrement: 1 },
        }),
      })
    );

    expect(mockTxPointHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          change: -50,
          reason: expect.stringContaining("void"),
        }),
      })
    );
  });

  it("returns 401 when unauthenticated", async () => {
    (requireUser as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const res = await POST(makeReq({ reason: "Test" }), makeCtx("sale1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when cashier tries to void", async () => {
    (requireUser as any).mockResolvedValue(OWNER);
    (requireRole as any).mockRejectedValue(new Error("FORBIDDEN"));

    const res = await POST(makeReq({ reason: "Test" }), makeCtx("sale1"));
    expect(res.status).toBe(403);
  });
});
