import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockPrismaProduct } = vi.hoisted(() => ({
  mockPrismaProduct: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: mockPrismaProduct,
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireUser: vi.fn(),
  requireRole: vi.fn(),
}));

import { GET } from "../../api/low-stock/route";
import { requireUser } from "@/lib/rbac";

// ---------- tests ----------

beforeEach(() => {
  vi.clearAllMocks();
  (requireUser as any).mockResolvedValue({ id: "u1", role: "CASHIER" });
});

describe("GET /api/low-stock", () => {
  it("returns products at or below threshold sorted by stock", async () => {
    const products = [
      { id: "p1", sku: "S1", name: "Apple", unit: "piece", stock: 0, lowStockThreshold: 10 },
      { id: "p2", sku: "S2", name: "Banana", unit: "kg", stock: 5, lowStockThreshold: 10 },
      { id: "p3", sku: "S3", name: "Cherry", unit: "piece", stock: 50, lowStockThreshold: 10 },
    ];
    mockPrismaProduct.findMany.mockResolvedValue(products);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    // p3 (stock 50) should NOT be in result (50 > 10)
    // p1 (0) and p2 (5) should be, sorted by stock ascending
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Apple"); // stock 0
    expect(data[1].name).toBe("Banana"); // stock 5
  });

  it("returns empty array when all stock is fine", async () => {
    mockPrismaProduct.findMany.mockResolvedValue([
      { id: "p1", sku: "S1", name: "Apple", unit: "piece", stock: 100, lowStockThreshold: 10 },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(data).toHaveLength(0);
  });

  it("returns 400 when unauthenticated", async () => {
    (requireUser as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const res = await GET();
    expect(res.status).toBe(400);
  });
});
