import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Settings singleton
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: process.env.SHOP_NAME || "SideSale Demo Shop",
      promptpayId: process.env.PROMPTPAY_ID || "",
      currency: process.env.CURRENCY || "THB",
    },
  });

  // Owner user
  const ownerEmail = process.env.SEED_OWNER_EMAIL || "owner@demo.local";
  const ownerPass = process.env.SEED_OWNER_PASSWORD || "owner1234";
  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "Shop Owner",
      password: await bcrypt.hash(ownerPass, 12),
      role: Role.OWNER,
    },
  });

  // Cashier user
  const cashierEmail = process.env.SEED_CASHIER_EMAIL || "cashier@demo.local";
  const cashierPass = process.env.SEED_CASHIER_PASSWORD || "cashier1234";
  await prisma.user.upsert({
    where: { email: cashierEmail },
    update: {},
    create: {
      email: cashierEmail,
      name: "Cashier One",
      password: await bcrypt.hash(cashierPass, 12),
      role: Role.CASHIER,
    },
  });

  // Demo categories
  const catCount = await prisma.category.count();
  const categories: Record<string, string> = {};
  if (catCount === 0) {
    const cats = [
      { name: "Beverages", color: "#3b82f6", sortOrder: 1 },
      { name: "Snacks", color: "#f59e0b", sortOrder: 2 },
      { name: "Instant Food", color: "#ef4444", sortOrder: 3 },
      { name: "Energy Drinks", color: "#10b981", sortOrder: 4 },
    ];
    for (const c of cats) {
      const created = await prisma.category.create({ data: c });
      categories[c.name] = created.id;
    }
    console.log(`Seeded ${cats.length} categories`);
  }

  // Demo products (only insert if none exist)
  const count = await prisma.product.count();
  if (count === 0) {
    const demo = [
      { sku: "P-0001", name: "Coca-Cola 325ml", price: 15, cost: 10, stock: 50, barcode: "8850999320014", categoryId: categories["Beverages"] },
      { sku: "P-0002", name: "Lay's Classic 50g", price: 20, cost: 13, stock: 40, barcode: "8851932111119", categoryId: categories["Snacks"] },
      { sku: "P-0003", name: "Mama Pork 55g", price: 7, cost: 5, stock: 100, barcode: "8850987150011", categoryId: categories["Instant Food"] },
      { sku: "P-0004", name: "Singha Water 600ml", price: 10, cost: 6, stock: 80, barcode: "8850999110012", categoryId: categories["Beverages"] },
      { sku: "P-0005", name: "Oishi Green Tea 500ml", price: 25, cost: 17, stock: 35, categoryId: categories["Beverages"] },
      { sku: "P-0006", name: "Pocky Strawberry 45g", price: 30, cost: 20, stock: 25, categoryId: categories["Snacks"] },
      { sku: "P-0007", name: "7-Up 325ml", price: 15, cost: 10, stock: 45, categoryId: categories["Beverages"] },
      { sku: "P-0008", name: "Snickers 51g", price: 28, cost: 19, stock: 30, categoryId: categories["Snacks"] },
      { sku: "P-0009", name: "Pringles Original 110g", price: 95, cost: 70, stock: 15, categoryId: categories["Snacks"] },
      { sku: "P-0010", name: "Red Bull 150ml", price: 12, cost: 8, stock: 60, categoryId: categories["Energy Drinks"] },
      { sku: "P-0011", name: "M-150 150ml", price: 10, cost: 7, stock: 70, categoryId: categories["Energy Drinks"] },
      { sku: "P-0012", name: "Nescafe Can 180ml", price: 22, cost: 15, stock: 40, categoryId: categories["Beverages"] },
    ];
    for (const p of demo) {
      await prisma.product.create({ data: p });
    }
    console.log(`Seeded ${demo.length} demo products`);
  }

  console.log("Seed complete.");
  console.log(`  Owner:   ${ownerEmail}`);
  console.log(`  Cashier: ${cashierEmail}`);
  if (ownerPass === "owner1234" || cashierPass === "cashier1234") {
    console.warn("\n  ⚠️  WARNING: You are using default demo passwords!");
    console.warn("  Set SEED_OWNER_PASSWORD and SEED_CASHIER_PASSWORD env vars for production.\n");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
