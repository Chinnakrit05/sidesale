import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

// CSV columns: sku, barcode, name, description, category, price, cost, stock, lowStockThreshold, active
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (values[i] || "").trim();
    });
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result.map((v) => v.replace(/^"|"$/g, "").trim());
}

export async function POST(req: Request) {
  try {
    const session = await requireRole("OWNER");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Empty or invalid CSV" }, { status: 400 });
    }

    // Build category lookup
    const categories = await prisma.category.findMany();
    const catMap = new Map<string, string>();
    for (const c of categories) {
      catMap.set(c.name.toLowerCase(), c.id);
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineNum = i + 2; // 1-based + header

      const sku = r.sku || r.SKU;
      if (!sku) {
        errors.push(`Row ${lineNum}: Missing SKU`);
        continue;
      }

      const name = r.name || r.Name;
      if (!name) {
        errors.push(`Row ${lineNum}: Missing name`);
        continue;
      }

      const priceRaw = parseFloat(r.price || r.Price || "");
      const costRaw = parseFloat(r.cost || r.Cost || "");
      const stockRaw = parseInt(r.stock || r.Stock || "", 10);
      const threshold = parseInt(r.lowStockThreshold || r.threshold || "5", 10);

      if (isNaN(priceRaw) || priceRaw < 0) {
        errors.push(`Row ${lineNum}: Invalid or missing price`);
        continue;
      }
      if (isNaN(costRaw) || costRaw < 0) {
        errors.push(`Row ${lineNum}: Invalid or missing cost`);
        continue;
      }
      if (isNaN(stockRaw)) {
        errors.push(`Row ${lineNum}: Invalid or missing stock`);
        continue;
      }
      const price = priceRaw;
      const cost = costRaw;
      const stock = stockRaw;
      const barcode = r.barcode || r.Barcode || null;
      const description = r.description || r.Description || null;
      const unit = r.unit || r.Unit || "piece";
      const categoryName = r.category || r.Category || "";
      const activeStr = (r.active || r.Active || "true").toLowerCase();
      const active = activeStr !== "false" && activeStr !== "0" && activeStr !== "no";

      const categoryId = categoryName ? catMap.get(categoryName.toLowerCase()) || null : null;

      try {
        const existing = await prisma.product.findUnique({ where: { sku } });
        if (existing) {
          const before = existing;
          const product = await prisma.product.update({
            where: { sku },
            data: {
              name,
              barcode: barcode || null,
              description: description || null,
              categoryId,
              unit,
              price,
              cost,
              stock,
              lowStockThreshold: threshold,
              active,
            },
          });
          await logAudit({
            entity: "product",
            entityId: product.id,
            action: "update",
            userId: session.id,
            userName: session.name || "",
            before: { name: before.name, price: String(before.price), cost: String(before.cost), stock: before.stock },
            after: { name, price: String(price), cost: String(cost), stock },
          });
          updated++;
        } else {
          const product = await prisma.product.create({
            data: {
              sku,
              name,
              barcode: barcode || undefined,
              description: description || undefined,
              categoryId: categoryId || undefined,
              unit,
              price,
              cost,
              stock,
              lowStockThreshold: threshold,
              active,
            },
          });
          await logAudit({
            entity: "product",
            entityId: product.id,
            action: "create",
            userId: session.id,
            userName: session.name || "",
            after: { sku, name, price: String(price), cost: String(cost), stock, source: "csv-import" },
          });
          created++;
        }
      } catch (e: any) {
        errors.push(`Row ${lineNum} (${sku}): ${e.message?.slice(0, 100)}`);
      }
    }

    return NextResponse.json({ created, updated, errors, total: rows.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
