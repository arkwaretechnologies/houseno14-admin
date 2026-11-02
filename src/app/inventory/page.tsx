"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Package,
  Plus,
  AlertTriangle,
  Barcode,
  Boxes,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatWidget } from "@/components/shared/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_PRODUCTS } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { createProduct, listProducts } from "@/services/products";
import type { Product } from "@/types";

const CATEGORY_LABELS: Record<Product["category"], string> = {
  merchandise: "Merchandise",
  balls: "Balls",
  paddles: "Paddles",
  food: "Food",
  drinks: "Drinks",
  other: "Other",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [
  Product["category"],
  string,
][];

const emptyForm = {
  name: "",
  sku: "",
  category: "merchandise" as Product["category"],
  price: "",
  cost: "",
  stock_qty: "0",
  low_stock_threshold: "5",
  barcode: "",
  is_active: true,
};

const columns: ColumnDef<Product, unknown>[] = [
  {
    accessorKey: "name",
    header: "Product",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">
          SKU: {row.original.sku || "—"}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">{CATEGORY_LABELS[row.original.category]}</Badge>
    ),
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => formatCurrency(row.original.price),
  },
  {
    accessorKey: "cost",
    header: "Cost",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatCurrency(row.original.cost)}
      </span>
    ),
  },
  {
    accessorKey: "stock_qty",
    header: "Stock",
    cell: ({ row }) => {
      const p = row.original;
      const low = p.stock_qty <= p.low_stock_threshold;
      return (
        <div className="flex items-center gap-2">
          <span className={low ? "font-semibold text-rose-500" : "font-medium"}>
            {p.stock_qty}
          </span>
          {low ? <Badge variant="destructive">Low stock</Badge> : null}
        </div>
      );
    },
  },
  {
    id: "barcode",
    header: "Barcode",
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <Barcode className="h-3.5 w-3.5" />
        {row.original.barcode ?? "—"}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? "success" : "secondary"}>
        {row.original.is_active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export default function InventoryPage() {
  const { isDemoMode, branch } = useAuthStore();
  const branchId = branch?.id ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

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
          DEMO_PRODUCTS.filter((p) => p.branch_id === branchId).map((p) => ({
            ...p,
          }))
        );
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const rows = await listProducts(supabase, branchId);
      setProducts(rows);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, isDemoMode]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock_qty <= p.low_stock_threshold).length,
    [products]
  );
  const totalValue = useMemo(
    () => products.reduce((sum, p) => sum + p.price * p.stock_qty, 0),
    [products]
  );
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock_qty, 0),
    [products]
  );

  const handlePurchaseOrder = () => {
    toast.success("Purchase order draft started", {
      description: "Add suppliers and quantities to complete the order.",
    });
  };

  async function handleCreateProduct() {
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    const name = form.name.trim();
    if (!name) {
      toast.error("Product name is required");
      return;
    }
    const price = Number(form.price);
    const cost = Number(form.cost);
    const stock = Number(form.stock_qty);
    const threshold = Number(form.low_stock_threshold);
    if (![price, cost, stock, threshold].every((n) => Number.isFinite(n) && n >= 0)) {
      toast.error("Enter valid price, cost, and stock values");
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        const created: Product = {
          id: `pr-${Date.now()}`,
          branch_id: branchId,
          name,
          sku: form.sku.trim(),
          category: form.category,
          price,
          cost,
          stock_qty: Math.round(stock),
          low_stock_threshold: Math.round(threshold),
          barcode: form.barcode.trim() || null,
          image_url: null,
          is_active: form.is_active,
          created_at: new Date().toISOString(),
        };
        setProducts((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const created = await createProduct(supabase, branchId, {
          name,
          sku: form.sku.trim() || null,
          category: form.category,
          price,
          cost,
          stock_qty: stock,
          low_stock_threshold: threshold,
          barcode: form.barcode.trim() || null,
          is_active: form.is_active,
        });
        setProducts((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
        );
      }
      toast.success("Product added");
      setDialogOpen(false);
      setForm(emptyForm);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Inventory"
        description="Track pro-shop stock, pricing, and reorder points across all product categories."
        actions={
          <Button onClick={handlePurchaseOrder}>
            <ShoppingCart className="h-4 w-4" />
            New Purchase Order
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget title="Total SKUs" value={products.length} icon={Package} />
        <StatWidget title="Units In Stock" value={totalUnits} icon={Boxes} delay={0.05} />
        <StatWidget
          title="Inventory Value"
          value={totalValue}
          currency
          icon={ShoppingCart}
          delay={0.1}
        />
        <StatWidget
          title="Low Stock Alerts"
          value={lowStockCount}
          icon={AlertTriangle}
          delay={0.15}
          className={lowStockCount > 0 ? "border-rose-400/40" : undefined}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center rounded-2xl border border-dashed py-20 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading inventory…
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Search products…"
            emptyTitle="No products found"
            emptyDescription="Add products to the pro-shop catalog to start tracking inventory."
            toolbar={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setForm(emptyForm);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            }
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-name">Name</Label>
              <Input
                id="inv-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-sku">SKU</Label>
              <Input
                id="inv-sku"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                placeholder="PAD-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-category">Category</Label>
              <select
                id="inv-category"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    category: e.target.value as Product["category"],
                  }))
                }
              >
                {CATEGORY_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-price">Price (₱)</Label>
              <Input
                id="inv-price"
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-cost">Cost (₱)</Label>
              <Input
                id="inv-cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-stock">Stock qty</Label>
              <Input
                id="inv-stock"
                type="number"
                min={0}
                step="1"
                value={form.stock_qty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, stock_qty: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-threshold">Low stock at</Label>
              <Input
                id="inv-threshold"
                type="number"
                min={0}
                step="1"
                value={form.low_stock_threshold}
                onChange={(e) =>
                  setForm((f) => ({ ...f, low_stock_threshold: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="inv-barcode">Barcode</Label>
              <Input
                id="inv-barcode"
                value={form.barcode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, barcode: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 sm:col-span-2">
              <Label htmlFor="inv-active">Active</Label>
              <Switch
                id="inv-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_active: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreateProduct()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
