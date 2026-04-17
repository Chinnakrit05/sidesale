# SideSale Mobile App — Architecture Plan

## สถาปัตยกรรมแอปมือถือ SideSale

> **Status:** Planning  
> **Date:** 2026-04-17  
> **Project:** `sidesale-app` (separate repository)  
> **Platforms:** Android + iOS (via React Native / Expo)

---

## 1. Overview / ภาพรวม

The SideSale mobile app provides a complete POS experience on smartphones and tablets. It supports two operating modes:

| Mode | ชื่อไทย | Database | Internet | Multi-device |
|------|---------|----------|----------|--------------|
| **Local** | โหมดเครื่องเดียว | SQLite (on device) | ไม่ต้องใช้ | ❌ เครื่องเดียว |
| **Server** | โหมดหลายเครื่อง | PostgreSQL (remote) | ต้องใช้ | ✅ หลายเครื่อง |

**Mode 1 (Local):** Everything runs on the device — no server, no internet, perfect for small shops with a single device. Data lives in SQLite.

**Mode 2 (Server):** Connects to a deployed SideSale server (the existing Next.js app). Multiple devices share the same data. Requires the shop owner to contact the developer for server setup.

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Framework** | React Native + Expo (Managed) | Cross-platform, shared JS knowledge with web app, OTA updates |
| **Navigation** | Expo Router (file-based) | Consistent with Next.js file-based routing |
| **UI Components** | React Native Paper + custom | Material Design 3, Thai-friendly, dark mode support |
| **State Management** | Zustand | Lightweight, simple, works well with both DB modes |
| **Local Database** | `expo-sqlite` (SQLite 3) | Built into Expo, zero config, reliable offline storage |
| **Remote API Client** | Axios / `ky` | HTTP client for Server mode API calls |
| **Auth (Local)** | PIN code (4-6 digits) | Simple for single-device use, stored as bcrypt hash in SQLite |
| **Auth (Server)** | JWT (from existing NextAuth) | Reuse existing server authentication |
| **Barcode Scanner** | `expo-camera` | Built-in barcode scanning for product lookup |
| **Receipt Printing** | `react-native-esc-pos-printer` | Bluetooth/USB thermal printer support |
| **Charts** | `react-native-chart-kit` or `victory-native` | Sales statistics visualization |
| **Localization** | `i18next` + `react-i18next` | EN/TH bilingual, consistent with web app |

---

## 3. Architecture Pattern

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                       │
│  (Screens / Components / Navigation)             │
├─────────────────────────────────────────────────┤
│               Zustand Stores                     │
│  (auth, cart, products, sales, settings)         │
├─────────────────────────────────────────────────┤
│          Data Repository Layer                   │
│  ┌──────────────┐    ┌──────────────────┐       │
│  │ LocalRepo    │    │ RemoteRepo       │       │
│  │ (SQLite)     │    │ (HTTP → Server)  │       │
│  └──────────────┘    └──────────────────┘       │
│         ▲                    ▲                   │
│         └────────┬───────────┘                   │
│            DataRepository                        │
│         (interface / adapter)                    │
├─────────────────────────────────────────────────┤
│              Mode Manager                        │
│  (reads stored preference → routes to correct   │
│   repository implementation)                     │
└─────────────────────────────────────────────────┘
```

The key design is the **Repository Pattern** with a common interface. Both `LocalRepo` (SQLite) and `RemoteRepo` (HTTP API) implement the same interface. The app doesn't care which one is active — it just calls `repo.getProducts()`, `repo.createSale()`, etc.

---

## 4. Database Abstraction Layer

### 4.1 Repository Interface

```typescript
// src/data/types.ts
interface IDataRepository {
  // Products
  getProducts(filter?: ProductFilter): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  updateStock(id: string, quantity: number, type: StockMovementType): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  
  // Sales
  createSale(sale: CreateSaleInput): Promise<Sale>;
  getSales(filter?: SaleFilter): Promise<Sale[]>;
  getSale(id: string): Promise<Sale | null>;
  voidSale(id: string, reason: string): Promise<void>;
  
  // Customers
  getCustomers(search?: string): Promise<Customer[]>;
  createCustomer(data: CreateCustomerInput): Promise<Customer>;
  updateCustomerPoints(id: string, change: number, reason: string): Promise<void>;
  
  // Stats / Dashboard
  getDashboardStats(period: DateRange): Promise<DashboardStats>;
  getSalesReport(period: DateRange): Promise<SalesReport>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(data: Partial<Settings>): Promise<Settings>;
  
  // Auth
  login(credentials: LoginInput): Promise<AuthResult>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  
  // Staff (OWNER only)
  getStaff(): Promise<User[]>;
  createStaff(data: CreateStaffInput): Promise<User>;
  updateStaff(id: string, data: UpdateStaffInput): Promise<User>;
}
```

### 4.2 Local Repository (SQLite)

```typescript
// src/data/local/LocalRepository.ts
class LocalRepository implements IDataRepository {
  private db: SQLiteDatabase;
  
  async getProducts(filter?) {
    const rows = await this.db.getAllAsync(
      'SELECT * FROM products WHERE active = 1 ORDER BY name'
    );
    return rows.map(mapRowToProduct);
  }
  
  async createSale(input) {
    return this.db.withTransactionAsync(async () => {
      // 1. Insert sale
      // 2. Insert sale items
      // 3. Update stock for each item
      // 4. Create stock movements
      // 5. Update customer points if applicable
      // All in one transaction — atomic
    });
  }
  // ... etc
}
```

### 4.3 Remote Repository (HTTP API)

```typescript
// src/data/remote/RemoteRepository.ts
class RemoteRepository implements IDataRepository {
  private api: AxiosInstance;
  private serverUrl: string;
  
  async getProducts(filter?) {
    const { data } = await this.api.get('/api/products', { params: filter });
    return data;
  }
  
  async createSale(input) {
    const { data } = await this.api.post('/api/sales', input);
    return data;
  }
  // ... maps 1:1 to existing SideSale API endpoints
}
```

### 4.4 Mode Manager

```typescript
// src/data/ModeManager.ts
class ModeManager {
  private mode: 'local' | 'server';
  private repo: IDataRepository;
  
  constructor() {
    // Read saved preference from AsyncStorage
    // Default: 'local'
  }
  
  getRepository(): IDataRepository {
    return this.repo;
  }
  
  async switchMode(mode: 'local' | 'server', serverConfig?: ServerConfig) {
    // Switching modes — this is a significant action
    // Show confirmation dialog
    // Local → Server: data stays on device but app reads from server
    // Server → Local: need to set up fresh local DB or import
  }
}
```

---

## 5. SQLite Schema (Local Mode)

Mapped from Prisma schema. SQLite doesn't have enums, so we use TEXT with CHECK constraints.

```sql
-- Users (local mode uses PIN instead of password)
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT UNIQUE,
  name        TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,          -- bcrypt hash of 4-6 digit PIN
  role        TEXT NOT NULL CHECK(role IN ('OWNER','CASHIER')) DEFAULT 'CASHIER',
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Categories
CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_categories_sort ON categories(sort_order);

-- Products
CREATE TABLE products (
  id                  TEXT PRIMARY KEY,
  sku                 TEXT NOT NULL UNIQUE,
  barcode             TEXT UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  category_id         TEXT REFERENCES categories(id),
  unit                TEXT NOT NULL DEFAULT 'piece',
  price               REAL NOT NULL,
  cost                REAL NOT NULL DEFAULT 0,
  stock               INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  image_uri           TEXT,              -- local file URI
  active              INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_category ON products(category_id);

-- Customers
CREATE TABLE customers (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  phone       TEXT UNIQUE,
  email       TEXT,
  points      INTEGER NOT NULL DEFAULT 0,
  total_spent REAL NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  note        TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_phone ON customers(phone);

-- Point History
CREATE TABLE point_history (
  id          TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  sale_id     TEXT,
  change      INTEGER NOT NULL,
  balance     INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_points_customer ON point_history(customer_id);
CREATE INDEX idx_points_date ON point_history(created_at);

-- Sales
CREATE TABLE sales (
  id              TEXT PRIMARY KEY,
  number          TEXT NOT NULL UNIQUE,
  cashier_id      TEXT NOT NULL REFERENCES users(id),
  customer_id     TEXT REFERENCES customers(id),
  subtotal        REAL NOT NULL,
  discount        REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  points_redeemed INTEGER NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL CHECK(payment_method IN ('CASH','PROMPTPAY')),
  paid_amount     REAL NOT NULL,
  change_amount   REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK(status IN ('COMPLETED','VOID')) DEFAULT 'COMPLETED',
  note            TEXT,
  void_reason     TEXT,
  void_at         TEXT,
  void_by_id      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sales_date ON sales(created_at);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_customer ON sales(customer_id);

-- Sale Items
CREATE TABLE sale_items (
  id          TEXT PRIMARY KEY,
  sale_id     TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  TEXT NOT NULL REFERENCES products(id),
  name        TEXT NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'piece',
  unit_price  REAL NOT NULL,
  quantity    INTEGER NOT NULL,
  subtotal    REAL NOT NULL
);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- Stock Movements
CREATE TABLE stock_movements (
  id          TEXT PRIMARY KEY,
  product_id  TEXT NOT NULL REFERENCES products(id),
  type        TEXT NOT NULL CHECK(type IN ('IN','OUT','ADJUST','VOID_RETURN')),
  quantity    INTEGER NOT NULL,
  reason      TEXT,
  user_id     TEXT REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_stock_product ON stock_movements(product_id);
CREATE INDEX idx_stock_date ON stock_movements(created_at);

-- Settings (singleton)
CREATE TABLE settings (
  id                INTEGER PRIMARY KEY DEFAULT 1 CHECK(id = 1),
  shop_name         TEXT NOT NULL DEFAULT 'My Shop',
  promptpay_id      TEXT NOT NULL DEFAULT '',
  currency          TEXT NOT NULL DEFAULT 'THB',
  tax_rate          REAL NOT NULL DEFAULT 0,
  points_per_baht   INTEGER NOT NULL DEFAULT 1,
  point_value       REAL NOT NULL DEFAULT 0.25,
  min_points_redeem INTEGER NOT NULL DEFAULT 100,
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE audit_log (
  id          TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  action      TEXT NOT NULL,
  changes     TEXT,               -- JSON string
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX idx_audit_date ON audit_log(created_at);
CREATE INDEX idx_audit_user ON audit_log(user_id);
```

---

## 6. Screen Map / รายการหน้าจอ

Mapped from the existing web app features:

### Shared Screens (ทั้ง OWNER + CASHIER)

| Screen | Description | Web Equivalent |
|--------|-------------|----------------|
| **Mode Selection** | เลือกโหมด Local/Server (แสดงครั้งแรก) | — (new) |
| **Login** | PIN (local) or Email+Password (server) | `/login` |
| **POS / ขายของ** | หน้าขายหลัก, สแกนบาร์โค้ด, ตะกร้า, ชำระเงิน | `/` (home) |
| **Cart** | ตะกร้าสินค้า, แก้จำนวน, ลบรายการ, ส่วนลด | part of POS |
| **Payment** | เลือกวิธีชำระ (เงินสด/PromptPay), คำนวณเงินทอน | payment dialog |
| **Receipt** | ใบเสร็จ, พิมพ์, แชร์ | `/receipt/[id]` |
| **Sales History** | ประวัติการขาย, ค้นหา, กรอง | `/sales` |
| **Customer Select** | เลือกลูกค้า/สมาชิกตอนขาย | customer dialog |

### OWNER-Only Screens (เจ้าของร้าน)

| Screen | Description | Web Equivalent |
|--------|-------------|----------------|
| **Dashboard** | สถิติยอดขาย, กราฟ, สรุปรายวัน/สัปดาห์/เดือน | `/dashboard` |
| **Products** | จัดการสินค้า, เพิ่ม/แก้/ลบ, อัพรูป | `/products` |
| **Categories** | จัดการหมวดหมู่ | `/categories` |
| **Stock** | ดู stock, เพิ่ม/ลด, ประวัติเคลื่อนไหว | `/stock` |
| **Customers** | จัดการสมาชิก, แต้ม, ประวัติ | `/customers` |
| **Staff** | จัดการพนักงาน (server mode) / จัดการ PIN (local) | `/settings` → staff |
| **Settings** | ตั้งค่าร้าน, PromptPay, แต้ม, ภาษี | `/settings` |
| **Audit Log** | ประวัติการเปลี่ยนแปลง | `/audit` |

### Mobile-Specific Screens (ไม่มีในเว็บ)

| Screen | Description |
|--------|-------------|
| **Barcode Scanner** | สแกนบาร์โค้ดด้วยกล้อง |
| **Printer Setup** | เชื่อมต่อเครื่องพิมพ์ Bluetooth |
| **Data Backup** | สำรอง/กู้คืนข้อมูล (local mode) |
| **Server Config** | ตั้งค่า URL เซิร์ฟเวอร์ (server mode) |

---

## 7. Project Structure

```
sidesale-app/
├── app/                          # Expo Router (file-based routing)
│   ├── _layout.tsx               # Root layout (mode provider, theme)
│   ├── index.tsx                 # Redirect → mode select or POS
│   ├── mode-select.tsx           # First-time mode selection
│   ├── login.tsx                 # Login screen
│   ├── (pos)/                    # POS tab group
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Main POS screen
│   │   ├── cart.tsx
│   │   ├── payment.tsx
│   │   └── receipt/[id].tsx
│   ├── (sales)/                  # Sales history
│   │   ├── _layout.tsx
│   │   └── index.tsx
│   ├── (manage)/                 # OWNER screens
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── products/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── categories.tsx
│   │   ├── stock.tsx
│   │   ├── customers/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── staff.tsx
│   │   ├── audit.tsx
│   │   └── settings.tsx
│   └── (settings)/               # App-level settings
│       ├── printer.tsx
│       ├── backup.tsx
│       └── server-config.tsx
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ProductCard.tsx
│   │   ├── CartItem.tsx
│   │   ├── PaymentDialog.tsx
│   │   ├── BarcodeScanner.tsx
│   │   ├── StatsCard.tsx
│   │   └── ...
│   ├── data/                     # Data layer (Repository pattern)
│   │   ├── types.ts              # Shared types & interfaces
│   │   ├── repository.ts         # IDataRepository interface
│   │   ├── ModeManager.ts        # Mode switching logic
│   │   ├── local/
│   │   │   ├── LocalRepository.ts
│   │   │   ├── migrations/       # SQLite migration files
│   │   │   │   ├── 001_initial.ts
│   │   │   │   └── ...
│   │   │   └── seed.ts           # Default data for local mode
│   │   └── remote/
│   │       ├── RemoteRepository.ts
│   │       └── api-client.ts     # Axios instance + interceptors
│   ├── stores/                   # Zustand stores
│   │   ├── useAuthStore.ts
│   │   ├── useCartStore.ts
│   │   ├── useProductStore.ts
│   │   └── useSettingsStore.ts
│   ├── hooks/                    # Custom React hooks
│   │   ├── useRepository.ts      # Get current repo instance
│   │   ├── useBarcode.ts
│   │   └── usePrinter.ts
│   ├── i18n/                     # Translations
│   │   ├── en.json
│   │   └── th.json
│   ├── theme/                    # Theme tokens (light/dark)
│   │   ├── colors.ts
│   │   └── typography.ts
│   └── utils/
│       ├── id.ts                 # cuid/nanoid generation
│       ├── format.ts             # Currency, date formatting
│       └── receipt.ts            # Receipt formatting for printer
├── assets/                       # Images, fonts
│   ├── logo.png
│   └── fonts/
├── app.json                      # Expo config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 8. Key Design Decisions

### 8.1 Authentication

| | Local Mode | Server Mode |
|---|---|---|
| **Method** | 4-6 digit PIN | Email + Password |
| **Storage** | SQLite `users` table | JWT token in SecureStore |
| **First Setup** | Create OWNER PIN on first launch | Login to existing server account |
| **Session** | PIN prompt on app open | Token refresh, auto-logout on expiry |

**Why PIN for local?** — A phone/tablet used as a POS at a small shop needs quick access. Typing full email+password every time is impractical. A 4-6 digit PIN is fast and sufficient for single-device security.

### 8.2 ID Generation

Local mode generates IDs on-device using `nanoid` or `cuid2` (same format as Prisma's `cuid()`). This ensures compatibility if we ever add data export/import between local and server modes.

### 8.3 Image Storage

| | Local Mode | Server Mode |
|---|---|---|
| **Product images** | Stored in app's document directory | URL from server (`/uploads/...`) |
| **Display** | `file://` URI | `https://server.com/uploads/...` |

### 8.4 Data Backup (Local Mode)

Since local mode has no server, data loss = phone lost/broken. We provide:

- **Export to file** — SQLite DB file exported to device storage / shared via email/cloud
- **Import from file** — Restore from backup file
- **Auto-backup reminder** — Weekly notification to remind backup

### 8.5 Offline Handling (Server Mode)

Server mode requires internet. If connection drops mid-operation:

- **Read operations**: Show cached data with "offline" indicator
- **Write operations (sales)**: Queue in local storage, sync when back online (basic offline queue)
- **Critical**: Show clear UI that device is offline — don't let cashier think sale was recorded

### 8.6 Receipt Printing

Support Bluetooth thermal printers (58mm/80mm) common in Thai shops:

- ESC/POS protocol via `react-native-esc-pos-printer`
- Also: share receipt as image (screenshot of receipt component)
- Also: no-print mode (just show on screen)

---

## 9. API Mapping (Server Mode)

The RemoteRepository maps directly to existing SideSale API:

| Repository Method | HTTP Method | API Endpoint |
|---|---|---|
| `login()` | POST | `/api/auth/callback/credentials` |
| `getProducts()` | GET | `/api/products` |
| `getCategories()` | GET | `/api/categories` |
| `createSale()` | POST | `/api/sales` |
| `getSales()` | GET | `/api/sales` |
| `voidSale()` | POST | `/api/sales` (void action) |
| `getCustomers()` | GET | `/api/customers` |
| `createCustomer()` | POST | `/api/customers` |
| `updateCustomerPoints()` | POST | `/api/customers/[id]/points` |
| `getStaff()` | GET | `/api/staff` |
| `createStaff()` | POST | `/api/staff` |
| `getDashboardStats()` | GET | `/api/sales?period=...` |
| `getSettings()` | GET | `/api/settings` |
| `updateSettings()` | PUT | `/api/settings` |
| `updateStock()` | POST | `/api/stock` |

**No new API endpoints needed** — the existing web app API covers all functionality.

---

## 10. Development Phases / ขั้นตอนการพัฒนา

### Phase 1: Foundation (2-3 สัปดาห์)
- [ ] Project setup: Expo + TypeScript + Expo Router
- [ ] Theme system (light/dark, Thai fonts)
- [ ] i18n setup (EN/TH)
- [ ] Repository interface + ModeManager
- [ ] SQLite schema + migrations
- [ ] Mode selection screen
- [ ] Local auth (PIN system)

### Phase 2: Core POS (3-4 สัปดาห์)
- [ ] Product list / grid with category filter
- [ ] Barcode scanner integration
- [ ] Cart management (add, remove, quantity, discount)
- [ ] Payment flow (cash + PromptPay QR)
- [ ] Receipt screen (view + share as image)
- [ ] Sales history list + detail

### Phase 3: Management Screens (2-3 สัปดาห์)
- [ ] Dashboard with charts
- [ ] Product CRUD + image capture
- [ ] Category management
- [ ] Stock management + movement history
- [ ] Customer management + points
- [ ] Settings screen

### Phase 4: Server Mode (2 สัปดาห์)
- [ ] RemoteRepository implementation
- [ ] Server config screen (URL + login)
- [ ] JWT auth flow with token refresh
- [ ] Offline queue for sales
- [ ] Connection status indicator

### Phase 5: Hardware & Polish (2 สัปดาห์)
- [ ] Bluetooth printer setup + printing
- [ ] Data backup/restore (local mode)
- [ ] Staff/PIN management
- [ ] Audit log viewer
- [ ] App icon + splash screen
- [ ] Performance optimization

### Phase 6: Release (1 สัปดาห์)
- [ ] Testing on real devices (Android + iOS)
- [ ] Build APK + submit to stores
- [ ] README + setup guide
- [ ] Publish to GitHub

**Total estimate: ~12-15 สัปดาห์** for one developer

---

## 11. Dependencies / แพ็กเกจที่ต้องใช้

```json
{
  "dependencies": {
    "expo": "~52.x",
    "expo-router": "~4.x",
    "expo-sqlite": "~15.x",
    "expo-camera": "~16.x",
    "expo-secure-store": "~14.x",
    "expo-file-system": "~18.x",
    "expo-sharing": "~13.x",
    "expo-image-picker": "~16.x",
    "expo-localization": "~16.x",
    "react-native-paper": "^5.x",
    "zustand": "^5.x",
    "axios": "^1.x",
    "i18next": "^24.x",
    "react-i18next": "^15.x",
    "nanoid": "^5.x",
    "bcryptjs": "^2.x",
    "react-native-chart-kit": "^6.x",
    "react-native-esc-pos-printer": "^4.x",
    "dayjs": "^1.x"
  }
}
```

---

## 12. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| SQLite performance with large datasets | Slow queries at 10K+ products | Pagination, indexes, limit result sets |
| Bluetooth printer compatibility | Some printers won't work | Test with popular Thai market models (Xprinter, Epson TM) |
| iOS App Store review delays | Launch delay | Submit Android first (APK/Play Store), iOS in parallel |
| Data loss in local mode | Customer loses all data | Auto-backup reminders, easy export |
| Server mode auth token expiry | Cashier kicked out mid-shift | Silent token refresh, 8hr session |
| Expo SDK breaking changes | Upgrade pain | Pin Expo SDK version, upgrade quarterly |

---

## 13. Future Enhancements (ไม่อยู่ใน scope แรก)

- **Data sync**: Local ↔ Server two-way sync (complex, Phase 2 of the project)
- **Multi-store**: One server, multiple shop locations
- **Inventory alerts**: Push notifications for low stock
- **Loyalty app**: Customer-facing app to check points
- **Kitchen display**: Order display for food shops
- **Reporting export**: PDF/Excel sales reports on mobile
