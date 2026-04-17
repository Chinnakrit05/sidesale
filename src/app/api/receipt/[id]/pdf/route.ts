import { NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  header: { textAlign: "center", marginBottom: 10 },
  shopName: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  meta: { fontSize: 9, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  divider: { borderTopWidth: 1, borderTopStyle: "dashed", borderTopColor: "#999", marginVertical: 6 },
  itemRow: { marginBottom: 3 },
  itemTop: { flexDirection: "row", justifyContent: "space-between" },
  itemSub: { fontSize: 8, color: "#666" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 12, fontWeight: "bold", marginTop: 4 },
  footer: { textAlign: "center", marginTop: 14, fontSize: 9 },
});

function money(n: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const [sale, settings] = await Promise.all([
      prisma.sale.findUnique({ where: { id }, include: { items: true, cashier: true } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);
    if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // IDOR protection: cashiers can only see their own receipts
    if (user.role !== "OWNER" && sale.cashierId !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const shopName = settings?.shopName || "SideSale";

    const doc = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: { width: 227, height: "auto" as any }, style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(Text, { style: styles.shopName }, shopName),
          React.createElement(Text, { style: styles.meta }, "Receipt")
        ),
        React.createElement(
          View,
          null,
          React.createElement(View, { style: styles.row }, [
            React.createElement(Text, { key: "l" }, "No.:"),
            React.createElement(Text, { key: "v" }, sale.number),
          ]),
          React.createElement(View, { style: styles.row }, [
            React.createElement(Text, { key: "l" }, "Date:"),
            React.createElement(Text, { key: "v" }, formatDate(sale.createdAt)),
          ]),
          React.createElement(View, { style: styles.row }, [
            React.createElement(Text, { key: "l" }, "Cashier:"),
            React.createElement(Text, { key: "v" }, sale.cashier.name),
          ]),
          React.createElement(View, { style: styles.row }, [
            React.createElement(Text, { key: "l" }, "Method:"),
            React.createElement(Text, { key: "v" }, sale.paymentMethod),
          ])
        ),
        React.createElement(View, { style: styles.divider }),
        ...sale.items.map((it: typeof sale.items[0]) =>
          React.createElement(
            View,
            { key: it.id, style: styles.itemRow },
            React.createElement(View, { style: styles.itemTop }, [
              React.createElement(Text, { key: "n" }, it.name),
              React.createElement(Text, { key: "s" }, money(Number(it.subtotal))),
            ]),
            React.createElement(
              Text,
              { style: styles.itemSub },
              `${it.quantity} x ${money(Number(it.unitPrice))}`
            )
          )
        ),
        React.createElement(View, { style: styles.divider }),
        React.createElement(View, { style: styles.row }, [
          React.createElement(Text, { key: "l" }, "Subtotal"),
          React.createElement(Text, { key: "v" }, money(Number(sale.subtotal))),
        ]),
        Number(sale.discount) > 0
          ? React.createElement(View, { style: styles.row }, [
              React.createElement(Text, { key: "l" }, "Discount"),
              React.createElement(Text, { key: "v" }, `-${money(Number(sale.discount))}`),
            ])
          : null,
        React.createElement(View, { style: styles.totalRow }, [
          React.createElement(Text, { key: "l" }, "Total"),
          React.createElement(Text, { key: "v" }, money(Number(sale.total))),
        ]),
        sale.paymentMethod === "CASH"
          ? React.createElement(
              View,
              null,
              React.createElement(View, { style: styles.row }, [
                React.createElement(Text, { key: "l" }, "Paid"),
                React.createElement(Text, { key: "v" }, money(Number(sale.paidAmount))),
              ]),
              React.createElement(View, { style: styles.row }, [
                React.createElement(Text, { key: "l" }, "Change"),
                React.createElement(Text, { key: "v" }, money(Number(sale.change))),
              ])
            )
          : null,
        React.createElement(Text, { style: styles.footer }, "Thank you!")
      )
    );

    const buffer = await renderToBuffer(doc as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="receipt-${sale.number}.pdf"`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    if (msg === "UNAUTHENTICATED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
