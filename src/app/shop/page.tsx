"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShopCheckoutDialog,
  type ShopCheckoutResult,
} from "@/components/shop/shop-checkout-dialog";
import { DEMO_PRODUCTS } from "@/lib/demo-data";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { listActiveProducts } from "@/services/products";
import { completeShopSale } from "@/services/shop";
import type { Product } from "@/types";

const CATEGORY_LABELS: Record<Product["category"], string> = {
  merchandise: "Merchandise",
  balls: "Balls",
  paddles: "Paddles",
  food: "Food",
  drinks: "Drinks",
  other: "Other",
};

type CartLine = {
  product: Product;
  quantity: number;
};

export default function ShopPage() {
  const { isDemoMode, branch } = useAuthStore();
  const branchId = branch?.id ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | Product["category"]>("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!branchId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        setProducts(
          DEMO_PRODUCTS.filter(
            (p) => p.branch_id === branchId && p.is_active
          ).map((p) => ({ ...p }))
        );
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const rows = await listActiveProducts(supabase, branchId);
      setProducts(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load shop catalog");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, isDemoMode]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const cartQtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart) map.set(line.product.id, line.quantity);
    return map;
  }, [cart]);

  const itemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart]
  );
  const totalPesos = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [cart]
  );
  const totalCents = Math.round(totalPesos * 100);

  function addToCart(product: Product) {
    if (product.stock_qty <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_qty) {
          toast.error(`Only ${product.stock_qty} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: l.quantity + 1, product }
            : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function setQty(productId: string, quantity: number) {
    setCart((prev) => {
      const line = prev.find((l) => l.product.id === productId);
      if (!line) return prev;
      if (quantity <= 0) return prev.filter((l) => l.product.id !== productId);
      if (quantity > line.product.stock_qty) {
        toast.error(`Only ${line.product.stock_qty} in stock`);
        return prev;
      }
      return prev.map((l) =>
        l.product.id === productId ? { ...l, quantity } : l
      );
    });
  }

  function clearCart() {
    setCart([]);
  }

  async function handleCheckout(result: ShopCheckoutResult) {
    if (!branchId || cart.length === 0) return;
    setConfirming(true);
    try {
      if (isDemoMode) {
        setProducts((prev) =>
          prev.map((p) => {
            const line = cart.find((c) => c.product.id === p.id);
            if (!line) return p;
            return { ...p, stock_qty: Math.max(0, p.stock_qty - line.quantity) };
          })
        );
      } else {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await completeShopSale(supabase, {
          branchId,
          items: cart.map((line) => ({
            product_id: line.product.id,
            quantity: line.quantity,
          })),
          paymentMethod: result.method,
          amountTenderedCents: result.amountTenderedCents,
        });
        await loadProducts();
      }

      const changeNote =
        result.method === "cash" && result.changeCents != null
          ? ` Change ${formatCurrency(result.changeCents / 100)}.`
          : "";
      toast.success(`Sale completed — ${formatCurrency(totalPesos)}.${changeNote}`);
      clearCart();
      setCheckoutOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Sale failed");
      await loadProducts();
    } finally {
      setConfirming(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Shop"
        description="Sell paddles, drinks, food, and merch from live inventory stock."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, SKU, barcode…"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={category === "all" ? "default" : "outline"}
              onClick={() => setCategory("all")}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                type="button"
                size="sm"
                variant={category === cat ? "default" : "outline"}
                onClick={() => setCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed py-20 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading catalog…
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="No products in catalog"
              description="Add products in Inventory first. Shop sells from the same live stock."
              action={
                <Button asChild>
                  <Link href="/inventory">Go to Inventory</Link>
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No matching products"
              description="Try another search or category filter."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => {
                const inCart = cartQtyById.get(product.id) ?? 0;
                const out = product.stock_qty <= 0;
                const low = product.stock_qty <= product.low_stock_threshold;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={out}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "rounded-2xl border bg-card/60 p-4 text-left transition hover:border-primary/40 hover:bg-card disabled:cursor-not-allowed disabled:opacity-50",
                      inCart > 0 && "border-primary/50 ring-1 ring-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-snug">{product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {CATEGORY_LABELS[product.category]}
                          {product.sku ? ` · ${product.sku}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{formatCurrency(product.price)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span
                        className={cn(
                          "tabular-nums",
                          out
                            ? "text-muted-foreground"
                            : low
                              ? "font-medium text-rose-500"
                              : "text-muted-foreground"
                        )}
                      >
                        {out ? "Out of stock" : `${product.stock_qty} in stock`}
                      </span>
                      {inCart > 0 ? (
                        <Badge variant="secondary">×{inCart}</Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <aside className="h-fit rounded-2xl border bg-card/70 p-4 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Cart</h2>
              {itemCount > 0 ? (
                <Badge variant="secondary">{itemCount}</Badge>
              ) : null}
            </div>
            {cart.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                Clear
              </Button>
            ) : null}
          </div>

          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Tap a product to add it to the cart.
            </p>
          ) : (
            <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {cart.map((line) => (
                <li
                  key={line.product.id}
                  className="rounded-xl border bg-background/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {line.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(line.product.price)} each
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => setQty(line.product.id, 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setQty(line.product.id, line.quantity - 1)
                        }
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {line.quantity}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={line.quantity >= line.product.stock_qty}
                        onClick={() =>
                          setQty(line.product.id, line.quantity + 1)
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatCurrency(line.product.price * line.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-semibold tabular-nums">
                {formatCurrency(totalPesos)}
              </span>
            </div>
            <Button
              className="w-full"
              disabled={cart.length === 0}
              onClick={() => setCheckoutOpen(true)}
            >
              Checkout
            </Button>
          </div>
        </aside>
      </div>

      <ShopCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        totalCents={totalCents}
        itemCount={itemCount}
        confirming={confirming}
        onConfirm={handleCheckout}
      />
    </DashboardShell>
  );
}
