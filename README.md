<p align="center">
  <img src="public/icon-512.png" width="120" alt="SideSale Logo" />
</p>

<h1 align="center">SideSale — Open Source POS</h1>

<p align="center">
  Free &amp; open-source Point of Sale for small shops · ระบบ POS โอเพนซอร์สฟรีสำหรับร้านค้า
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
  <img src="https://img.shields.io/badge/next.js-15-black" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/typescript-5-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/docker-ready-2496ED" alt="Docker" />
</p>

---

## Tech Stack / เทคโนโลยีที่ใช้

| Layer | Technology | Purpose / วัตถุประสงค์ |
|-------|-----------|----------------------|
| Framework | **Next.js 15** (App Router) | Full-stack React framework · เฟรมเวิร์กเว็บ full-stack |
| Language | **TypeScript 5** | Type-safe code · โค้ดที่ปลอดภัยด้วย type |
| Database | **PostgreSQL 16** | Relational database · ฐานข้อมูล |
| ORM | **Prisma 5** | Database access & migrations · จัดการฐานข้อมูลและ migration |
| Authentication | **Auth.js v5** (NextAuth) | Login, session, JWT · ระบบล็อกอินและจัดการ session |
| UI Components | **Tailwind CSS** + **shadcn/ui** (Radix) | Styling & accessible components · สไตล์และ UI components |
| Charts | **Recharts** | Sales analytics graphs · กราฟวิเคราะห์ยอดขาย |
| State | **Zustand** | Client state management · จัดการ state ฝั่ง client |
| Form | **React Hook Form** + **Zod** | Form handling & validation · จัดการฟอร์มและตรวจสอบข้อมูล |
| i18n | **next-intl** | Thai / English localization · รองรับ 2 ภาษา (ไทย / อังกฤษ) |
| Theme | **next-themes** | Light / Dark / System mode · โหมดสว่าง / มืด |
| QR Payment | **promptpay-qr** + **qrcode** | PromptPay QR generation · สร้าง QR พร้อมเพย์ |
| Receipt PDF | **@react-pdf/renderer** | PDF receipt generation · สร้างใบเสร็จ PDF |
| Testing | **Vitest** | Unit & integration tests · ทดสอบระบบ |
| Deploy | **Docker Compose** | One-command deployment · ติดตั้งด้วยคำสั่งเดียว |

---

## Features / ฟีเจอร์ทั้งหมด

### 🛒 POS — Point of Sale / หน้าขาย

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Product grid | Browse products by category with image thumbnails | เลือกสินค้าตามหมวดหมู่พร้อมรูปภาพ |
| Search & barcode | Search by name, SKU, or barcode scan | ค้นหาด้วยชื่อ, SKU หรือสแกนบาร์โค้ด |
| Cart management | Add, remove, adjust quantity in cart | เพิ่ม ลบ แก้ไขจำนวนในตะกร้า |
| Cash payment | Calculate change automatically | จ่ายเงินสด คำนวณเงินทอนอัตโนมัติ |
| PromptPay QR | Generate QR code for Thai mobile payment | สร้าง QR Code พร้อมเพย์สำหรับรับชำระ |
| Customer link | Attach sale to customer for points | เชื่อมลูกค้ากับรายการขายเพื่อสะสมแต้ม |
| Discount | Apply discount per transaction | ใส่ส่วนลดแต่ละรายการ |

### 🧾 Receipt / ใบเสร็จ

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| On-screen receipt | View receipt details after sale | ดูใบเสร็จบนหน้าจอหลังขาย |
| PDF download | Download receipt as PDF (thermal printer format) | ดาวน์โหลดใบเสร็จ PDF (รูปแบบเครื่องพิมพ์ความร้อน) |
| Print | Browser print dialog | สั่งพิมพ์ผ่านเบราว์เซอร์ |
| Void sale | Cancel completed sale with reason | ยกเลิกการขายที่เสร็จแล้วพร้อมระบุเหตุผล |

### 📦 Products / สินค้า

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| CRUD | Create, edit, delete products | สร้าง แก้ไข ลบ สินค้า |
| Details | SKU, barcode, name, description, image | รหัส SKU, บาร์โค้ด, ชื่อ, คำอธิบาย, รูปภาพ |
| Pricing | Price, cost, profit calculation | ราคาขาย, ต้นทุน, คำนวณกำไร |
| Units | Customizable unit types (piece, kg, etc.) | กำหนดหน่วยสินค้า (ชิ้น, กก. ฯลฯ) |
| CSV import | Bulk import products from CSV file | นำเข้าสินค้าจำนวนมากจากไฟล์ CSV |
| CSV export | Export all products to CSV | ส่งออกสินค้าทั้งหมดเป็น CSV |
| Image upload | Upload product photos (JPEG, PNG, WebP, GIF) | อัปโหลดรูปสินค้า |

### 🏷️ Categories / หมวดหมู่

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| CRUD | Create, edit, delete categories | สร้าง แก้ไข ลบ หมวดหมู่ |
| Color coding | Assign color to each category | กำหนดสีให้แต่ละหมวด |
| Sort order | Custom display order | กำหนดลำดับการแสดงผล |

### 📊 Stock Management / จัดการสต็อก

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Stock movements | Track IN, OUT, ADJUST, VOID_RETURN | ติดตาม รับเข้า, จ่ายออก, ปรับ, คืนจากยกเลิก |
| Movement history | Full log of all stock changes | ประวัติการเคลื่อนไหวสต็อกทั้งหมด |
| Low stock alerts | Warning when stock below threshold | แจ้งเตือนเมื่อสินค้าต่ำกว่าขั้นต่ำ |
| Manual adjust | Owner can adjust stock with reason | เจ้าของร้านปรับสต็อกได้พร้อมระบุเหตุผล |

### 👥 Customers & Points / ลูกค้าและแต้มสะสม

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Customer CRUD | Create, edit, deactivate customers | สร้าง แก้ไข ปิดการใช้งานลูกค้า |
| Contact info | Phone, email, notes | เบอร์โทร, อีเมล, หมายเหตุ |
| Points earn | Auto-earn points on purchase (configurable rate) | สะสมแต้มอัตโนมัติเมื่อซื้อ (กำหนดอัตราได้) |
| Points redeem | Redeem points for discount | ใช้แต้มแลกส่วนลด |
| Points history | Full point transaction log | ประวัติการใช้แต้มทั้งหมด |
| Manual adjust | Owner can adjust points manually | เจ้าของร้านปรับแต้มได้ |
| Visit tracking | Track customer visit count & total spent | ติดตามจำนวนครั้งที่มาและยอดใช้จ่ายรวม |

### 📈 Dashboard / แดชบอร์ด (Owner only / เฉพาะเจ้าของ)

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Today's summary | Total sales, orders, average | สรุปยอดวันนี้ — ยอดขาย, ออเดอร์, ค่าเฉลี่ย |
| 14-day trend | Sales chart for past 2 weeks | กราฟยอดขาย 14 วันย้อนหลัง |
| Top products | Best-selling products | สินค้าขายดี |
| Low stock | Products below threshold | สินค้าใกล้หมด |
| Recent orders | Latest transactions | รายการขายล่าสุด |

### 📋 Reports / รายงาน (Owner only / เฉพาะเจ้าของ)

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Date range filter | Filter sales by custom date range | กรองยอดขายตามช่วงวัน |
| By product | Revenue breakdown per product | รายได้แยกตามสินค้า |
| By cashier | Performance per staff member | ยอดขายแยกตามพนักงาน |
| Transaction list | All sales with details | รายการขายทั้งหมดพร้อมรายละเอียด |

### 👤 Staff & Roles / พนักงานและสิทธิ์

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Two roles | **Owner** (full access) / **Cashier** (POS only) | **เจ้าของร้าน** (เข้าถึงทุกอย่าง) / **คนขาย** (ขายของอย่างเดียว) |
| Staff CRUD | Create, edit, deactivate staff accounts | สร้าง แก้ไข ปิดการใช้งานบัญชีพนักงาน |
| My Sales | Cashiers can view their own sales history | คนขายดูประวัติการขายของตัวเองได้ |

### 🔒 Security / ความปลอดภัย

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| JWT sessions | 8-hour session expiry | Session หมดอายุ 8 ชั่วโมง |
| Bcrypt hashing | Password hashed with bcrypt (12 rounds) | รหัสผ่านเข้ารหัสด้วย bcrypt (12 รอบ) |
| CSRF protection | Origin/Referer validation on mutations | ป้องกัน CSRF ด้วยการตรวจ Origin/Referer |
| Security headers | X-Frame-Options, HSTS, CSP headers | HTTP security headers |
| RBAC | Role-based access on every API route | ควบคุมสิทธิ์เข้าถึงทุก API |
| Rate limiting | Brute-force protection on login | ป้องกัน brute-force หน้าล็อกอิน |
| Audit log | Track all data changes with user attribution | บันทึกทุกการเปลี่ยนแปลงพร้อมผู้ทำ |
| Input validation | Zod schema validation on all API inputs | ตรวจสอบข้อมูลทุก input ด้วย Zod |

### 🔧 Settings / ตั้งค่า (Owner only / เฉพาะเจ้าของ)

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| Shop name | Store display name | ชื่อร้านค้า |
| PromptPay ID | Mobile number or national ID for QR | เบอร์มือถือ/เลขบัตรประชาชนสำหรับ QR |
| Currency | Currency code (THB, USD, etc.) | สกุลเงิน |
| Points config | Points rate, redemption value, minimum | อัตราสะสมแต้ม, มูลค่าแลก, ขั้นต่ำ |

### 🌐 Other / อื่นๆ

| Feature | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| PWA | Installable as app on mobile/desktop | ติดตั้งเป็นแอปบนมือถือ/คอมได้ |
| Offline indicator | Shows when connection is lost | แสดงสถานะเมื่อออฟไลน์ |
| Service Worker | Cache static assets for fast loading | แคชไฟล์เพื่อโหลดเร็ว |
| i18n | Thai + English, switch instantly | ไทย + อังกฤษ สลับได้ทันที |
| Dark mode | Light / Dark / System auto | โหมดสว่าง / มืด / ตามระบบ |
| Responsive | Works on desktop, tablet, and mobile | ใช้ได้ทุกขนาดหน้าจอ |

---

## Owner vs Cashier Access / สิทธิ์การเข้าถึง

| Page | Owner (เจ้าของ) | Cashier (คนขาย) |
|------|:-:|:-:|
| POS (หน้าขาย) | ✅ | ✅ |
| My Sales (ยอดขายของฉัน) | — | ✅ |
| Dashboard (แดชบอร์ด) | ✅ | — |
| Products (สินค้า) | ✅ | — |
| Categories (หมวดหมู่) | ✅ | — |
| Stock (สต็อก) | ✅ | — |
| Customers (ลูกค้า) | ✅ | — |
| Staff (พนักงาน) | ✅ | — |
| Reports (รายงาน) | ✅ | — |
| Audit Log (บันทึกกิจกรรม) | ✅ | — |
| Settings (ตั้งค่า) | ✅ | — |

---

## Installation / วิธีติดตั้ง

### Option 1: Docker (Recommended / แนะนำ)

**Prerequisites / สิ่งที่ต้องมี:**
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

```bash
# 1. Clone the repository / โคลนโปรเจกต์
git clone https://github.com/YOUR_USERNAME/sidesale.git
cd sidesale

# 2. Create .env from template / สร้างไฟล์ .env
cp .env.example .env

# 3. Edit .env — change passwords & secrets (see below)
#    แก้ไข .env — เปลี่ยนรหัสผ่านและ secret (ดูรายละเอียดด้านล่าง)
nano .env

# 4. Start everything / เริ่มระบบ
docker compose up -d

# 5. Open browser / เปิดเบราว์เซอร์
# http://localhost:3000
```

The system will automatically:
1. Start PostgreSQL database
2. Run database migrations
3. Seed initial data (owner + cashier accounts, demo products)

ระบบจะทำให้อัตโนมัติ:
1. เปิดฐานข้อมูล PostgreSQL
2. รัน migration ฐานข้อมูล
3. สร้างข้อมูลเริ่มต้น (บัญชีเจ้าของ + คนขาย, สินค้าตัวอย่าง)

---

### Option 2: Local Development / พัฒนาบนเครื่อง

**Prerequisites / สิ่งที่ต้องมี:**
- Node.js 20+
- PostgreSQL 14+ (running locally)

```bash
# 1. Clone / โคลน
git clone https://github.com/YOUR_USERNAME/sidesale.git
cd sidesale

# 2. Install dependencies / ติดตั้ง dependencies
npm install

# 3. Create .env / สร้างไฟล์ .env
cp .env.example .env
# Edit DATABASE_URL to point to your local PostgreSQL
# แก้ DATABASE_URL ให้ชี้ไปยัง PostgreSQL บนเครื่อง
# Example: DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/sidesale

# 4. Generate Prisma client / สร้าง Prisma client
npx prisma generate

# 5. Run migrations / รัน migration
npx prisma migrate dev --name init

# 6. Seed data / ใส่ข้อมูลเริ่มต้น
npm run db:seed

# 7. Start dev server / เริ่ม dev server
npm run dev

# Open http://localhost:3000
```

---

## Commands / คำสั่งที่ใช้

| Command | Description (EN) | คำอธิบาย (TH) |
|---------|-----------------|---------------|
| `npm run dev` | Start development server (hot reload) | เริ่ม dev server (อัปเดตอัตโนมัติ) |
| `npm run build` | Build for production | สร้างไฟล์สำหรับ production |
| `npm start` | Start production server | เริ่ม production server |
| `npm test` | Run all tests | รันเทสทั้งหมด |
| `npm run test:watch` | Run tests in watch mode | รันเทสแบบ watch |
| `npm run test:coverage` | Run tests with coverage report | รันเทสพร้อมรายงาน coverage |
| `npx prisma generate` | Generate Prisma client | สร้าง Prisma client |
| `npx prisma migrate dev` | Create & run new migration | สร้างและรัน migration ใหม่ |
| `npx prisma migrate deploy` | Run pending migrations (production) | รัน migration ที่รอ (production) |
| `npx prisma studio` | Open Prisma database GUI | เปิด GUI จัดการฐานข้อมูล |
| `npm run db:seed` | Seed initial data | ใส่ข้อมูลเริ่มต้น |
| `docker compose up -d` | Start all services (Docker) | เริ่มระบบทั้งหมด (Docker) |
| `docker compose down` | Stop all services | หยุดระบบทั้งหมด |
| `docker compose logs -f app` | View app logs | ดู log ของแอป |

---

## Environment Variables / ตั้งค่า .env

Copy `.env.example` to `.env` and edit:  
คัดลอก `.env.example` เป็น `.env` แล้วแก้ไข:

### Required / จำเป็น

| Variable | Description (EN) | คำอธิบาย (TH) | Example |
|----------|-----------------|---------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | URL เชื่อมต่อฐานข้อมูล | `postgresql://user:pass@db:5432/sidesale` |
| `AUTH_SECRET` | Random secret for JWT signing — generate with: `openssl rand -base64 32` | Secret สำหรับเข้ารหัส JWT — สร้างด้วย: `openssl rand -base64 32` | `a1b2c3d4...` |
| `POSTGRES_USER` | Database username | ชื่อผู้ใช้ฐานข้อมูล | `sidesale` |
| `POSTGRES_PASSWORD` | Database password (**change this!**) | รหัสผ่านฐานข้อมูล (**ต้องเปลี่ยน!**) | `my_strong_password` |
| `POSTGRES_DB` | Database name | ชื่อฐานข้อมูล | `sidesale` |

### Seed Accounts / บัญชีเริ่มต้น

| Variable | Description (EN) | คำอธิบาย (TH) | Default |
|----------|-----------------|---------------|---------|
| `SEED_OWNER_EMAIL` | Owner login email | อีเมลเจ้าของร้าน | `owner@demo.local` |
| `SEED_OWNER_PASSWORD` | Owner password (min 8 chars) | รหัสผ่านเจ้าของ (ขั้นต่ำ 8 ตัว) | `owner1234` |
| `SEED_CASHIER_EMAIL` | Cashier login email | อีเมลคนขาย | `cashier@demo.local` |
| `SEED_CASHIER_PASSWORD` | Cashier password (min 8 chars) | รหัสผ่านคนขาย (ขั้นต่ำ 8 ตัว) | `cashier1234` |

### Shop Settings / ตั้งค่าร้าน

| Variable | Description (EN) | คำอธิบาย (TH) | Default |
|----------|-----------------|---------------|---------|
| `SHOP_NAME` | Shop display name | ชื่อร้าน | `SideSale Demo Shop` |
| `PROMPTPAY_ID` | Thai mobile (10 digits) or national ID (13 digits) | เบอร์มือถือ (10 หลัก) หรือเลขบัตร ปชช. (13 หลัก) | — |
| `CURRENCY` | Currency code | สกุลเงิน | `THB` |

### Other / อื่นๆ

| Variable | Description (EN) | คำอธิบาย (TH) | Default |
|----------|-----------------|---------------|---------|
| `AUTH_TRUST_HOST` | Trust host header (set `true` for Docker) | Trust host header (ตั้ง `true` สำหรับ Docker) | `true` |
| `NEXTAUTH_URL` | Public URL of the app | URL สาธารณะของแอป | `http://localhost:3000` |

---

## Default Login / ข้อมูลเข้าใช้งาน

After first startup, the system creates these accounts from your `.env`:  
หลังเริ่มระบบครั้งแรก ระบบจะสร้างบัญชีจาก `.env`:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Owner (เจ้าของร้าน) | Set in `SEED_OWNER_EMAIL` | Set in `SEED_OWNER_PASSWORD` | Full access / เข้าถึงทุกอย่าง |
| Cashier (คนขาย) | Set in `SEED_CASHIER_EMAIL` | Set in `SEED_CASHIER_PASSWORD` | POS only / ขายของอย่างเดียว |

**Default (if you don't change .env):**

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@demo.local` | `owner1234` |
| Cashier | `cashier@demo.local` | `cashier1234` |

> ⚠️ **Change default passwords before deploying to production!**  
> ⚠️ **เปลี่ยนรหัสผ่านก่อนนำขึ้น production!**

---

## Project Structure / โครงสร้างโปรเจกต์

```
sidesale/
├── prisma/
│   ├── schema.prisma       # Database schema / โครงสร้างฐานข้อมูล
│   └── seed.ts             # Initial data seeder / ข้อมูลเริ่มต้น
├── public/
│   ├── sw.js               # Service Worker (PWA)
│   ├── manifest.json       # PWA manifest
│   └── uploads/            # Product images / รูปสินค้า
├── messages/
│   ├── en.json             # English translations
│   └── th.json             # Thai translations / คำแปลภาษาไทย
├── docker/
│   └── entrypoint.sh       # Docker startup script
├── src/
│   ├── app/
│   │   ├── (app)/          # Authenticated pages / หน้าที่ต้อง login
│   │   │   ├── dashboard/  # Analytics dashboard / แดชบอร์ด
│   │   │   ├── pos/        # Point of sale / หน้าขาย
│   │   │   ├── products/   # Product management / จัดการสินค้า
│   │   │   ├── categories/ # Category management / จัดการหมวดหมู่
│   │   │   ├── customers/  # Customer management / จัดการลูกค้า
│   │   │   ├── stock/      # Stock management / จัดการสต็อก
│   │   │   ├── staff/      # Staff management / จัดการพนักงาน
│   │   │   ├── reports/    # Sales reports / รายงานการขาย
│   │   │   ├── audit/      # Audit log / บันทึกกิจกรรม
│   │   │   ├── settings/   # Shop settings / ตั้งค่าร้าน
│   │   │   ├── my-sales/   # Cashier sales history / ประวัติขายของคนขาย
│   │   │   └── receipt/    # Receipt view / ดูใบเสร็จ
│   │   ├── api/            # REST API routes
│   │   └── login/          # Login page / หน้า login
│   ├── components/
│   │   └── ui/             # shadcn/ui components
│   ├── lib/
│   │   ├── prisma.ts       # Database client
│   │   ├── rbac.ts         # Role-based access control
│   │   ├── csrf.ts         # CSRF protection
│   │   ├── rate-limit.ts   # Rate limiting
│   │   ├── audit.ts        # Audit logger
│   │   ├── promptpay.ts    # PromptPay QR utility
│   │   └── utils.ts        # Shared utilities
│   ├── auth.ts             # NextAuth configuration
│   └── middleware.ts        # Route protection + security headers
├── .env.example            # Environment template
├── docker-compose.yml      # Docker services
├── Dockerfile              # Multi-stage Docker build
└── package.json
```

---

## Database Models / โมเดลฐานข้อมูล

| Model | Description (EN) | คำอธิบาย (TH) |
|-------|-----------------|---------------|
| User | Staff accounts with roles | บัญชีพนักงาน (Owner/Cashier) |
| Category | Product categories | หมวดหมู่สินค้า |
| Product | Products with SKU, barcode, pricing, stock | สินค้า พร้อม SKU, บาร์โค้ด, ราคา, สต็อก |
| Customer | Loyalty customers with points | ลูกค้าสมาชิกพร้อมแต้มสะสม |
| PointHistory | Point earning/redemption log | ประวัติการสะสม/แลกแต้ม |
| Sale | Completed transactions | รายการขาย |
| SaleItem | Line items per sale | รายการสินค้าในแต่ละใบขาย |
| StockMovement | Inventory change log | บันทึกการเคลื่อนไหวสต็อก |
| AuditLog | System-wide change tracking | บันทึกทุกการเปลี่ยนแปลงในระบบ |
| Settings | Shop configuration (singleton) | การตั้งค่าร้าน (มี record เดียว) |

---

## API Endpoints

<details>
<summary>Click to expand / คลิกเพื่อดู</summary>

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/[...nextauth]` | Login, logout, session |

### Sales
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sales` | Create new sale |
| POST | `/api/sales/[id]/void` | Void a completed sale |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Create product |
| PUT | `/api/products` | Update product |
| DELETE | `/api/products?id=` | Delete product |
| POST | `/api/products/import` | CSV bulk import |
| GET | `/api/products/export` | CSV export |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories` | Update category |
| DELETE | `/api/categories?id=` | Delete category |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers` | Update customer |
| DELETE | `/api/customers?id=` | Deactivate customer |
| GET | `/api/customers/[id]/points` | Get point history |
| POST | `/api/customers/[id]/points` | Adjust points |

### Stock
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock` | List stock movements |
| POST | `/api/stock` | Manual stock adjustment |
| GET | `/api/low-stock` | List low-stock products |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff` | List staff |
| POST | `/api/staff` | Create staff |
| PUT | `/api/staff` | Update staff |
| DELETE | `/api/staff?id=` | Deactivate staff |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/settings` | Get/update shop settings |
| POST | `/api/promptpay-qr` | Generate PromptPay QR |
| GET | `/api/receipt/[id]/pdf` | Download receipt PDF |
| POST | `/api/upload` | Upload product image |
| GET | `/api/audit` | Get audit logs |

</details>

---

## License / สัญญาอนุญาต

MIT — Free to use, modify, and distribute.  
MIT — ใช้ แก้ไข และเผยแพร่ได้ฟรี

See [LICENSE](LICENSE) for details.
