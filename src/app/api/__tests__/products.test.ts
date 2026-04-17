import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- mocks (vi.hoisted so they're available in hoisted vi.mock factories) ----------

const { mockPrismaProduct, mockPrismaSaleItem } = vi.hoisted(() => ({
  mockPrismaProduct: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  },
  mockPrismaSaleItem: {
    count: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: mockPrismaProduct,
    saleItem: mockPrismaSaleItem,
  },
}));

vi.mock("@/lib/rbac", () => ({
  requireRole: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { GET, POST, PUT, DELETE } from "../../api/products/route";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// ---------- helpers ----------

const OWNER = { id: "u1", name: "Owner", role: "OWNER" };

function makeProduct(overrides: Record<string, any> = {}) {
  return {
    id: "prod1",
    sku: "SKU001",
    barcode: null,
    name: "Apple",
    description: null,
    imageUrl: null,
    categoryId: null,
    unit: "piece",
    price: 35,
    cost: 20,
    stock: 100,
    lowStockThreshold: 10,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function jsonReq(body: any, method = "POST") {
  return new Request("http://localhost/api/products", {
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

describe("GET /api/products", () => {
  it("returns products with price/cost as strings", async () => {
    const prod = makeProduct();
    mockPrismaProduct.findMany.mockResolvedValue([prod]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].price).toBe("35");
    expect(data[0].cost).toBe("20");
    expect(data[0].unit).toBe("piece");
  });

  it("returns 401 when unauthenticated", async () => {
    (requireRole as any).mockRejectedValue(new Error("UNAUTHENTICATED"));

    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/products", () => {
  it("creates a product and logs audit", async () => {
    const created = makeProduct();
    mockPrismaProduct.create.mockResolvedValue(created);

    const body = {
      sku: "SKU001",
      name: "Apple",
      unit: "piece",
      price: 35,
      cost: 20,
      stock: 100,
      lowStockThreshold: 10,
      active: true,
    };
    const res = await POST(jsonReq(body));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("prod1");
    expect(mockPrismaProduct.create).toHaveBeenCalledOnce();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ entity: "product", action: "create" })
    );
  });

  it("returns 400 for invalid body (missing name)", async () => {
    const body = { sku: "SKU001", price: 35, cost: 20, stock: 10, lowStockThreshold: 5, active: true };
    const res = await POST(jsonReq(body));
    expect(res.status).toBe(400);
  });

  it("returns 403 when cashier tries to create", async () => {
    (requireRole as any).mockRejectedValue(new Error("FORBIDDEN"));

    const body = { sku: "S", name: "X", price: 1, cost: 1, stock: 1, lowStockThreshold: 0, active: true };
    const res = await POST(jsonReq(body));
    expect(res.status).toBe(403);
  });
});

describe("PUT /api/products", () => {
  it("updates product and logs audit with diff", async () => {
    const before = makeProduct({ price: 30 });
    const after = makeProduct({ price: 40 });
    mockPrismaProduct.findUnique.mockResolvedValue(before);
    mockPrismaProduct.update.mockResolvedValue(after);

    const body = {
      id: "prod1",
      sku: "SKU001",
      name: "Apple",
      unit: "piece",
      price: 40,
      cost: 20,
      stock: 100,
      lowStockThreshold: 10,
      active: true,
    };
    const res = await PUT(jsonReq(body, "PUT"));
    expect(res.status).toBe(200);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "update", before: expect.any(Object), after: expect.any(Object) })
    );
  });

  it("returns 400 when id missing", async () => {
    const body = { sku: "S", name: "X", price: 1, cost: 1, stock: 1, lowStockThreshold: 0, active: true };
    const res = await PUT(jsonReq(body, "PUT"));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("id required");
  });
});

describe("DELETE /api/products", () => {
  it("hard deletes when no sales reference", async () => {
    const prod = makeProduct();
    mockPrismaProduct.findUnique.mockResolvedValue(prod);
    mockPrismaSaleItem.count.mockResolvedValue(0);
    mockPrismaProduct.delete.mockResolvedValue(prod);

    const req = new Request("http://localhost/api/products?id=prod1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.softDeleted).toBeUndefined();
    expect(mockPrismaProduct.delete).toHaveBeenCalledWith({ where: { id: "prod1" } });
  });

  it("soft deletes when product has sale items", async () => {
    const prod = makeProduct();
    mockPrismaProduct.findUnique.mockResolvedValue(prod);
    mockPrismaSaleItem.count.mockResolvedValue(3);
    mockPrismaProduct.update.mockResolvedValue({ ...prod, active: false });

    const req = new Request("http://localhost/api/products?id=prod1", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();

    expect(data.softDeleted).toBe(true);
    expect(mockPrismaProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { active: false } })
    );
  });

  it("returns 400 when id missing", async () => {
    const req = new Request("http://localhost/api/products", { method: "DELETE" });
    const res = await DELETE(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("id required");
  });
});
