import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockTxProduct, mockTxSale, mockTxCustomer, mockTxSettings, mockTxStockMovement, mockTxPointHistory, tx } = vi.hoisted(() => {
  const mockTxProduct = { findMany: vi.fn(), update: vi.fn() };
  const mockTxSale = { create: vi.fn() };
  const mockTxCustomer = { findUnique: vi.fn(), update: vi.fn() };
  const mockTxSettings = { findUnique: vi.fn() };
  const mockTxStockMovement = { create: vi.fn() };
  const mockTxPointHistory = { create: vi.fn() };
  return {
    mockTxProduct, mockTxSale, mockTxCustomer, mockTxSettings, mockTxStockMovement, mockTxPointHistory,
    tx: {
      product: mockTxProduct,
      sale: mockTxSale,
      customer: mockTxCustomer,
      settings: mockTxSettings,
      stockMovement: mockTxStockMovement,
      pointHistory: mockTxPointHistory,
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (cb: any) => cb(tx)),
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireUser: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => null),
  RATE_LIMITS: { api: { max: 100, windowSec: 60 }, login: { max: 5, windowSec: 60 }, sensitive: { max: 10, windowSec: 300 } },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    generateSaleNumber: vi.fn(() => "S260417-1234"),
  };
});

import { POST } from "../../api/sales/route";
import { requireUser } from "@/lib/rbac";
import { rateLimitResponse } from "@/lib/rate-limit";

// ---------- helpers ----------

const USER = { id: "u1", name: "Cashier", role: "CASHIER" };

function makeReq(body: any) {
  return new Request("http://localhost/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const defaultSettings = { id: 1, pointValue: 0.25, pointsPerBaht: 1, minPointsRedeem: 100 };

const defaultProduct = {
  id: "prod1",
  name: "Apple",
  price: 35,
  cost: 20,
  stock: 100,
  unit: "piece",
};

// ---------- tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as any).mockResolvedValue(USER);
  (rateLimitResponse as any).mockReturnValue(null);

  // Default mock setup
  mockTxProduct.findMany.mockResolvedValue([defaultProduct]);
  mockTxSettings.findUnique.mockResolvedValue(defaultSettings);
  mockTxSale.create.mockImplementation(async ({ data }: any) => ({
    id: "sale1",
    number: data.number,
    ...data,
  }));
  mockTxProduct.update.mockResolvedValue({});
  mockTxStockMovement.create.mockResolvedValue({});
});

describe("POST /api/sales", () => {
  it("creates a sale with correct totals", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 3 }],
      discount: 5,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.number).toBe("S260417-1234");
    // subtotal = 35 * 3 = 105, discount = 5, total = 100
    expect(data.subtotal).toBe(105);
    expect(data.total).toBe(100);
    expect(data.change).toBe(0); // paidAmount 100 - total 100
  });

  it("decrements stock and logs movement", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 2 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    await POST(makeReq(body));

    expect(mockTxProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prod1" },
        data: { stock: { decrement: 2 } },
      })
    );
    expect(mockTxStockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod1",
          type: "OUT",
          quantity: 2,
        }),
      })
    );
  });

  it("rejects insufficient stock", async () => {
    mockTxProduct.findMany.mockResolvedValue([{ ...defaultProduct, stock: 1 }]);

    const body = {
      items: [{ productId: "prod1", quantity: 5 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 1000,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Insufficient stock");
  });

  it("rejects product not found", async () => {
    mockTxProduct.findMany.mockResolvedValue([]);

    const body = {
      items: [{ productId: "nonexistent", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Product not found");
  });

  it("rejects insufficient paid amount for CASH", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 3 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 10, // 35*3=105, need 105 but only paid 10
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Insufficient paid amount");
  });

  it("allows PROMPTPAY without exact paid amount", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "PROMPTPAY",
      paidAmount: 0, // PromptPay auto-sets paidAmount = total
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(200);
  });

  it("returns 400 for empty items", async () => {
    const body = {
      items: [],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    (requireUser as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    const limitedResponse = new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "Retry-After": "60" } }
    );
    (rateLimitResponse as any).mockReturnValue(limitedResponse);

    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    };
    const res = await POST(makeReq(body));
    expect(res.status).toBe(429);
  });
});

describe("POST /api/sales with customer & points", () => {
  const customer = { id: "cust1", name: "Alice", points: 500, totalSpent: 1000, visitCount: 5 };

  beforeEach(() => {
    mockTxCustomer.findUnique.mockResolvedValue(customer);
    mockTxCustomer.update.mockResolvedValue({});
    mockTxPointHistory.create.mockResolvedValue({});
  });

  it("earns points based on total", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 3 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 200,
      customerId: "cust1",
      pointsRedeemed: 0,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(200);
    // total = 105, pointsPerBaht = 1, so pointsEarned = floor(105*1) = 105
    expect(data.pointsEarned).toBe(105);

    // Check customer update: increment points by 105 (earned - redeemed=0)
    expect(mockTxCustomer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 105 },
          visitCount: { increment: 1 },
        }),
      })
    );
  });

  it("redeems points and reduces total", async () => {
    const body = {
      items: [{ productId: "prod1", quantity: 3 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 200,
      customerId: "cust1",
      pointsRedeemed: 200,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(200);
    // subtotal=105, pointsDiscount=200*0.25=50, total = max(0, 105-0-50) = 55
    expect(data.total).toBe(55);
    expect(data.pointsRedeemed).toBe(200);

    // Check that point history for redeem was created
    expect(mockTxPointHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          change: -200,
          reason: expect.stringContaining("redeem"),
        }),
      })
    );
  });

  it("rejects insufficient points", async () => {
    mockTxCustomer.findUnique.mockResolvedValue({ ...customer, points: 50 });

    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 200,
      customerId: "cust1",
      pointsRedeemed: 200,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Insufficient points");
  });

  it("rejects points below minimum redeem", async () => {
    // minPointsRedeem = 100, trying to redeem 50
    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 200,
      customerId: "cust1",
      pointsRedeemed: 50,
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Minimum redeem");
  });

  it("rejects unknown customer", async () => {
    mockTxCustomer.findUnique.mockResolvedValue(null);

    const body = {
      items: [{ productId: "prod1", quantity: 1 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 200,
      customerId: "nonexistent",
    };
    const res = await POST(makeReq(body));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Customer not found");
  });
});
