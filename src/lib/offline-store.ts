// IndexedDB-based offline queue for POS sales
// When network is unavailable, sales are stored here and synced when online.

const DB_NAME = "sidesale_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_sales";
const PRODUCTS_STORE = "cached_products";

export type OfflineSale = {
  id: string; // client-generated UUID
  payload: {
    items: { productId: string; quantity: number }[];
    discount: number;
    paymentMethod: "CASH" | "PROMPTPAY";
    paidAmount: number;
    customerId?: string;
    pointsRedeemed?: number;
  };
  createdAt: string;
  synced: boolean;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        db.createObjectStore(PRODUCTS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Add a sale to the offline queue */
export async function addOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(sale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get all pending (unsynced) sales */
export async function getPendingSales(): Promise<OfflineSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => {
      const all = req.result as OfflineSale[];
      resolve(all.filter((s) => !s.synced));
    };
    req.onerror = () => reject(req.error);
  });
}

/** Mark a sale as synced */
export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result) {
        store.put({ ...getReq.result, synced: true });
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Remove synced sales older than 24h */
export async function cleanupSynced(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      for (const sale of req.result as OfflineSale[]) {
        if (sale.synced && new Date(sale.createdAt).getTime() < cutoff) {
          store.delete(sale.id);
        }
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Cache products for offline POS */
export async function cacheProducts(products: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, "readwrite");
    const store = tx.objectStore(PRODUCTS_STORE);
    store.clear();
    for (const p of products) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get cached products */
export async function getCachedProducts(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PRODUCTS_STORE, "readonly");
    const req = tx.objectStore(PRODUCTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Generate a UUID for offline sales */
export function generateOfflineId(): string {
  return "offline_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

/** Sync all pending sales to the server */
export async function syncPendingSales(): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const pending = await getPendingSales();
  if (pending.length === 0) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const sale of pending) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale.payload),
      });

      if (res.ok) {
        await markSynced(sale.id);
        synced++;
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        errors.push(`${sale.id}: ${err.error || res.statusText}`);
        failed++;
      }
    } catch (e) {
      // Still offline
      errors.push(`${sale.id}: Network error`);
      failed++;
    }
  }

  await cleanupSynced();
  return { synced, failed, errors };
}
