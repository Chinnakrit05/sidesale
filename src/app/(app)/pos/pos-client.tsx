"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Plus, Minus, Trash2, ShoppingCart, Package, UserCircle, X, Star, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { PaymentDialog } from "./payment-dialog";

type CategoryTab = {
  id: string;
  name: string;
  color: string;
};

type CustomerResult = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  points: number;
};

type PointsConfig = {
  pointsPerBaht: number;
  pointValue: number;
  minPointsRedeem: number;
};

type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  unit: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
};

export type CartItem = {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  stock: number;
};

export function PosClient({
  products,
  categories,
  promptpayId,
  shopName,
  pointsConfig,
}: {
  products: Product[];
  categories: CategoryTab[];
  promptpayId: string;
  shopName: string;
  pointsConfig: PointsConfig;
}) {
  const t = useTranslations("pos");
  const tc = useTranslations("common");
  const tu = useTranslations("units");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [payOpen, setPayOpen] = useState(false);

  // Customer / loyalty
  const [customer, setCustomer] = useState<CustomerResult | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<CustomerResult[]>([]);
  const [custOpen, setCustOpen] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);

  const filtered = useMemo(() => {
    let list = products;
    if (catFilter) {
      list = list.filter((p) => p.categoryId === catFilter);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
    );
  }, [products, query, catFilter]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountNum = Math.max(0, Math.min(subtotal, Number(discount) || 0));
  const pointsDiscount = redeemPoints * Number(pointsConfig.pointValue);
  const total = Math.max(0, subtotal - discountNum - pointsDiscount);

  function add(p: Product) {
    if (p.stock <= 0) return;
    setCart((c) => {
      const ex = c.find((x) => x.productId === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) return c;
        return c.map((x) => (x.productId === p.id ? { ...x, quantity: x.quantity + 1 } : x));
      }
      return [...c, { productId: p.id, name: p.name, unit: p.unit, price: p.price, quantity: 1, stock: p.stock }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((c) =>
      c
        .map((x) => (x.productId === id ? { ...x, quantity: Math.min(Math.max(qty, 1), x.stock) } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  function removeItem(id: string) {
    setCart((c) => c.filter((x) => x.productId !== id));
  }

  function clearCart() {
    setCart([]);
    setDiscount("0");
    setCustomer(null);
    setRedeemPoints(0);
  }

  async function searchCustomers(q: string) {
    setCustQuery(q);
    if (q.length < 2) {
      setCustResults([]);
      return;
    }
    const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setCustResults(data.map((c: any) => ({ id: c.id, code: c.code, name: c.name, phone: c.phone, points: c.points })));
    }
  }

  function selectCustomer(c: CustomerResult) {
    setCustomer(c);
    setCustOpen(false);
    setCustQuery("");
    setCustResults([]);
    setRedeemPoints(0);
  }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    const q = query.trim().toLowerCase();
    const byBarcode = products.find((p) => (p.barcode || "").toLowerCase() === q);
    if (byBarcode) {
      add(byBarcode);
      setQuery("");
      return;
    }
    if (filtered.length === 1) {
      add(filtered[0]);
      setQuery("");
    }
  }

  async function onPaid(saleId: string) {
    setPayOpen(false);
    clearCart();
    // Offline sales have no receipt — stay on POS
    if (saleId.startsWith("offline_")) {
      return;
    }
    router.push(`/receipt/${saleId}`);
  }

  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-4 h-[calc(100vh-5rem)] sm:h-[calc(100vh-8rem)]">
      {/* ── Product grid ── */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <Input
            autoFocus
            placeholder={t("searchPlaceholder")}
            className="pl-10 h-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onScan}
          />
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCatFilter(null)}
              className={cn(
                "px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                !catFilter ? "btn-gradient text-primary-foreground" : "bg-surface-lowest text-muted-foreground hover:bg-surface-high"
              )}
            >
              {tc("all")}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCatFilter(catFilter === c.id ? null : c.id)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                  catFilter === c.id
                    ? "text-white"
                    : "bg-surface-lowest text-muted-foreground hover:bg-surface-high"
                )}
                style={catFilter === c.id ? { backgroundColor: c.color } : undefined}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1.5"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Product cards — responsive grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 overflow-y-auto pr-1 pb-20 lg:pb-1">
          {filtered.map((p) => {
            const out = p.stock <= 0;
            const low = !out && p.stock <= p.lowStockThreshold;
            return (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={out}
                className={cn(
                  "flex flex-col items-start rounded-2xl bg-surface-lowest text-left transition-all overflow-hidden group",
                  "hover:shadow-ambient active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-20 sm:h-24 object-cover" />
                ) : (
                  <div className="w-full h-20 sm:h-24 bg-primary-container/10 flex items-center justify-center">
                    <span className="text-xl sm:text-2xl font-bold text-primary/30 font-display">{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="p-2 sm:p-3 w-full flex-1 flex flex-col">
                  <div className="text-[10px] sm:text-[11px] text-muted-foreground">{p.sku}</div>
                  <div className="font-medium text-xs sm:text-sm line-clamp-2 flex-1 text-on-surface">{p.name}</div>
                  <div className="mt-1 sm:mt-1.5 flex items-center justify-between w-full">
                    <div className="font-bold text-xs sm:text-sm text-on-primary-container">{formatMoney(p.price)}</div>
                    {out ? (
                      <span className="text-[10px] sm:text-[11px] text-destructive font-medium">{t("outOfStock")}</span>
                    ) : low ? (
                      <span className="text-[10px] sm:text-[11px] text-amber-500">{p.stock} {tu(p.unit)}</span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">{p.stock} {tu(p.unit)}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-8">
              {tc("noData")}
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile floating cart button ── */}
      <button
        className={cn(
          "lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-2xl px-5 py-3.5 shadow-ambient-lg transition-all",
          "bg-primary text-primary-foreground font-semibold text-sm",
          cart.length === 0 && "opacity-70"
        )}
        onClick={() => setCartOpen(true)}
      >
        <ShoppingCart className="h-5 w-5" strokeWidth={2} />
        {cartCount > 0 && (
          <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">{cartCount}</span>
        )}
        <span>{formatMoney(total)}</span>
      </button>

      {/* ── Mobile cart overlay ── */}
      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative bg-surface-lowest rounded-t-3xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            {/* Cart header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold font-display">
                <ShoppingCart className="h-5 w-5" strokeWidth={2} /> {t("cart")} ({cartCount})
              </div>
              <div className="flex items-center gap-1">
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground text-xs">
                    {t("clear")}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCartOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-3 min-h-0">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  {t("emptyCart")}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((i, idx) => (
                    <div
                      key={i.productId}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl transition-colors",
                        idx % 2 === 0 ? "bg-surface-low/60" : ""
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1 text-on-surface">{i.name}</div>
                        <div className="text-xs text-muted-foreground">{formatMoney(i.price)}/{tu(i.unit)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => setQty(i.productId, i.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <input
                          type="number"
                          value={i.quantity}
                          onChange={(e) => setQty(i.productId, parseInt(e.target.value || "1", 10))}
                          className="w-12 h-8 rounded-lg text-center bg-surface-lowest ghost-border text-sm"
                        />
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" onClick={() => setQty(i.productId, i.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="w-16 text-right font-bold text-sm text-on-primary-container">{formatMoney(i.price * i.quantity)}</div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg shrink-0" onClick={() => removeItem(i.productId)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer — totals (mobile) */}
            <div className="p-4 bg-surface-low/40 rounded-t-2xl space-y-2 safe-area-bottom">
              {/* Customer loyalty section */}
              <div className="space-y-1.5">
                {customer ? (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-accent/50">
                    <UserCircle className="h-5 w-5 text-primary shrink-0" strokeWidth={2} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">{customer.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 text-primary-container" /> {customer.points.toLocaleString()} {t("points")}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => { setCustomer(null); setRedeemPoints(0); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setCustOpen(!custOpen)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl ghost-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <UserCircle className="h-4 w-4" strokeWidth={2} /> {t("addMember")}
                    </button>
                    {custOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-lowest rounded-xl shadow-ambient-lg z-50 p-2.5">
                        <Input
                          placeholder={t("searchMember")}
                          value={custQuery}
                          onChange={(e) => searchCustomers(e.target.value)}
                          className="h-8 text-sm mb-1.5"
                          autoFocus
                        />
                        {custResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto space-y-0.5">
                            {custResults.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => selectCustomer(c)}
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-accent transition-colors"
                              >
                                <UserCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium line-clamp-1">{c.name}</div>
                                  <div className="text-xs text-muted-foreground">{c.code} {c.phone && `• ${c.phone}`}</div>
                                </div>
                                <div className="text-xs text-primary font-medium flex items-center gap-0.5">
                                  <Star className="h-3 w-3" /> {c.points}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {custQuery.length >= 2 && custResults.length === 0 && (
                          <div className="text-xs text-muted-foreground text-center py-2">{t("noMemberFound")}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {customer && customer.points >= pointsConfig.minPointsRedeem && subtotal > 0 && (
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <Star className="h-4 w-4 text-primary-container shrink-0" />
                    <span className="text-muted-foreground text-xs whitespace-nowrap">{t("redeemPoints")}</span>
                    <input
                      type="number"
                      min={0}
                      max={customer.points}
                      value={redeemPoints || ""}
                      onChange={(e) => {
                        const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), customer.points);
                        setRedeemPoints(v);
                      }}
                      className="w-20 h-7 rounded-lg px-2 text-right bg-surface-lowest ghost-border text-sm"
                      placeholder="0"
                    />
                    <span className="text-xs text-muted-foreground">= {formatMoney(redeemPoints * Number(pointsConfig.pointValue))}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("subtotal")}</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{t("discount")}</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 h-8 rounded-lg px-2 text-right bg-surface-lowest ghost-border"
                />
              </div>
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-sm text-primary">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {t("pointsDiscount")}</span>
                  <span>-{formatMoney(pointsDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2">
                <span className="font-display">{t("total")}</span>
                <span className="text-on-primary-container">{formatMoney(total)}</span>
              </div>
              <Button
                size="lg"
                className="w-full text-base"
                disabled={cart.length === 0 || total <= 0}
                onClick={() => setPayOpen(true)}
              >
                {t("checkout")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Cart panel ── */}
      <Card className="hidden lg:flex flex-col min-h-0 bg-surface-lowest">
        {/* Cart header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold font-display">
            <ShoppingCart className="h-5 w-5" strokeWidth={2} /> {t("cart")}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
              {t("clear")}
            </Button>
          )}
        </div>

        {/* Cart items — alternating bg instead of dividers */}
        <div className="flex-1 overflow-y-auto px-2">
          {cart.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {t("emptyCart")}
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((i, idx) => (
                <div
                  key={i.productId}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl transition-colors",
                    idx % 2 === 0 ? "bg-surface-low/60" : ""
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1 text-on-surface">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{formatMoney(i.price)}/{tu(i.unit)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="secondary" className="h-7 w-7 rounded-lg" onClick={() => setQty(i.productId, i.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <input
                      type="number"
                      value={i.quantity}
                      onChange={(e) => setQty(i.productId, parseInt(e.target.value || "1", 10))}
                      className="w-12 h-7 rounded-lg text-center bg-surface-lowest ghost-border text-sm"
                    />
                    <Button size="icon" variant="secondary" className="h-7 w-7 rounded-lg" onClick={() => setQty(i.productId, i.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-bold text-sm text-on-primary-container">{formatMoney(i.price * i.quantity)}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => removeItem(i.productId)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer — totals */}
        <div className="p-4 bg-surface-low/40 rounded-b-[1rem] space-y-2.5">
          {/* Customer / Loyalty */}
          <div className="space-y-1.5">
            {customer ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-accent/50">
                <UserCircle className="h-5 w-5 text-primary shrink-0" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-1">{customer.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-primary-container" /> {customer.points.toLocaleString()} {t("points")}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 rounded-lg" onClick={() => { setCustomer(null); setRedeemPoints(0); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setCustOpen(!custOpen)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl ghost-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <UserCircle className="h-4 w-4" strokeWidth={2} /> {t("addMember")}
                </button>
                {custOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-lowest rounded-xl shadow-ambient-lg z-50 p-2.5">
                    <Input
                      placeholder={t("searchMember")}
                      value={custQuery}
                      onChange={(e) => searchCustomers(e.target.value)}
                      className="h-8 text-sm mb-1.5"
                      autoFocus
                    />
                    {custResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {custResults.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-accent transition-colors"
                          >
                            <UserCircle className="h-4 w-4 shrink-0" strokeWidth={2} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium line-clamp-1">{c.name}</div>
                              <div className="text-xs text-muted-foreground">{c.code} {c.phone && `• ${c.phone}`}</div>
                            </div>
                            <div className="text-xs text-primary font-medium flex items-center gap-0.5">
                              <Star className="h-3 w-3" /> {c.points}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {custQuery.length >= 2 && custResults.length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">{t("noMemberFound")}</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {customer && customer.points >= pointsConfig.minPointsRedeem && subtotal > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-primary-container shrink-0" />
                <span className="text-muted-foreground text-xs whitespace-nowrap">{t("redeemPoints")}</span>
                <input
                  type="number"
                  min={0}
                  max={customer.points}
                  value={redeemPoints || ""}
                  onChange={(e) => {
                    const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), customer.points);
                    setRedeemPoints(v);
                  }}
                  className="w-20 h-7 rounded-lg px-2 text-right bg-surface-lowest ghost-border text-sm"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground">= {formatMoney(redeemPoints * Number(pointsConfig.pointValue))}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("subtotal")}</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">{t("discount")}</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-24 h-8 rounded-lg px-2 text-right bg-surface-lowest ghost-border"
            />
          </div>
          {pointsDiscount > 0 && (
            <div className="flex justify-between text-sm text-primary">
              <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {t("pointsDiscount")}</span>
              <span>-{formatMoney(pointsDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-3">
            <span className="font-display">{t("total")}</span>
            <span className="text-on-primary-container">{formatMoney(total)}</span>
          </div>
          <Button
            size="lg"
            className="w-full text-base"
            disabled={cart.length === 0 || total <= 0}
            onClick={() => setPayOpen(true)}
          >
            {t("checkout")}
          </Button>
        </div>
      </Card>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={onPaid}
        cart={cart}
        subtotal={subtotal}
        discount={discountNum}
        total={total}
        promptpayId={promptpayId}
        shopName={shopName}
        customerId={customer?.id || null}
        pointsRedeemed={redeemPoints}
        pointsDiscount={pointsDiscount}
      />
    </div>
  );
}
