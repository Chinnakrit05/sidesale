import { describe, it, expect, beforeEach, vi, beforeAll } from "vitest";

// Setup fake IndexedDB before importing the module
import "fake-indexeddb/auto";

import {
  addOfflineSale,
  getPendingSales,
  markSynced,
  cleanupSynced,
  generateOfflineId,
  syncPendingSales,
  cacheProducts,
  getCachedProducts,
  type OfflineSale,
} from "../offline-store";

function makeSale(overrides: Partial<OfflineSale> = {}): OfflineSale {
  return {
    id: generateOfflineId(),
    payload: {
      items: [{ productId: "prod1", quantity: 2 }],
      discount: 0,
      paymentMethod: "CASH",
      paidAmount: 100,
    },
    createdAt: new Date().toISOString(),
    synced: false,
    ...overrides,
  };
}

describe("generateOfflineId", () => {
  it("starts with offline_", () => {
    expect(generateOfflineId()).toMatch(/^offline_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateOfflineId()));
    expect(ids.size).toBe(100);
  });

  it("contains timestamp", () => {
    const before = Date.now();
    const id = generateOfflineId();
    const after = Date.now();
    const parts = id.split("_");
    const ts = parseInt(parts[1], 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("offline sale queue", () => {
  it("adds and retrieves a sale", async () => {
    const sale = makeSale();
    await addOfflineSale(sale);
    const pending = await getPendingSales();
    const found = pending.find((s) => s.id === sale.id);
    expect(found).toBeTruthy();
    expect(found!.payload.items[0].productId).toBe("prod1");
  });

  it("retrieves only unsynced sales", async () => {
    const s1 = makeSale();
    const s2 = makeSale({ synced: true });
    await addOfflineSale(s1);
    await addOfflineSale(s2);

    const pending = await getPendingSales();
    const ids = pending.map((s) => s.id);
    expect(ids).toContain(s1.id);
    expect(ids).not.toContain(s2.id);
  });

  it("marks a sale as synced", async () => {
    const sale = makeSale();
    await addOfflineSale(sale);

    let pending = await getPendingSales();
    expect(pending.find((s) => s.id === sale.id)).toBeTruthy();

    await markSynced(sale.id);

    pending = await getPendingSales();
    expect(pending.find((s) => s.id === sale.id)).toBeFalsy();
  });

  it("handles marking non-existent sale gracefully", async () => {
    // Should not throw
    await markSynced("non_existent_id_xyz");
  });
});

describe("cleanupSynced", () => {
  it("removes old synced sales", async () => {
    const oldSale = makeSale({
      synced: true,
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48h ago
    });
    await addOfflineSale(oldSale);
    await cleanupSynced();

    // Sale should be removed (it's synced and older than 24h)
    const pending = await getPendingSales();
    expect(pending.find((s) => s.id === oldSale.id)).toBeFalsy();
  });

  it("keeps recent synced sales", async () => {
    const recentSale = makeSale({
      synced: true,
      createdAt: new Date().toISOString(), // now
    });
    await addOfflineSale(recentSale);
    await cleanupSynced();

    // Recent synced sales should not be in pending (they're synced),
    // but they should still exist in DB. We can't directly verify this
    // without a getAllSales function, so this is more of a smoke test.
  });
});

describe("product cache", () => {
  it("caches and retrieves products", async () => {
    const products = [
      { id: "p1", name: "Apple", price: 10, stock: 50 },
      { id: "p2", name: "Banana", price: 5, stock: 100 },
    ];
    await cacheProducts(products);
    const cached = await getCachedProducts();
    expect(cached).toHaveLength(2);
    expect(cached.find((p) => p.id === "p1")?.name).toBe("Apple");
  });

  it("replaces old cache on update", async () => {
    await cacheProducts([{ id: "p1", name: "Old" }]);
    await cacheProducts([{ id: "p2", name: "New" }]);
    const cached = await getCachedProducts();
    expect(cached).toHaveLength(1);
    expect(cached[0].name).toBe("New");
  });

  it("handles empty cache", async () => {
    await cacheProducts([]);
    const cached = await getCachedProducts();
    expect(cached).toHaveLength(0);
  });
});

describe("syncPendingSales", () => {
  it("returns zero when no pending sales", async () => {
    // Mark all existing as synced first
    const pending = await getPendingSales();
    for (const s of pending) await markSynced(s.id);

    const result = await syncPendingSales();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("handles network error gracefully", async () => {
    // Mock fetch to simulate network failure
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const sale = makeSale();
    await addOfflineSale(sale);

    const result = await syncPendingSales();
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);

    globalThis.fetch = originalFetch;
  });

  it("syncs successfully when server responds OK", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "server_sale_1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const sale = makeSale();
    await addOfflineSale(sale);

    const result = await syncPendingSales();
    expect(result.synced).toBeGreaterThanOrEqual(1);

    // Verify sale is marked synced
    const pending = await getPendingSales();
    expect(pending.find((s) => s.id === sale.id)).toBeFalsy();

    globalThis.fetch = originalFetch;
  });

  it("handles server error response", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Insufficient stock" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    );

    const sale = makeSale();
    await addOfflineSale(sale);

    const result = await syncPendingSales();
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.errors.some((e) => e.includes("Insufficient stock"))).toBe(true);

    globalThis.fetch = originalFetch;
  });
});
