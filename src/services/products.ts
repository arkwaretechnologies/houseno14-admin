import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types";

type Client = SupabaseClient<Database>;
type MerchRow = Database["public"]["Tables"]["merchandise_products"]["Row"];

export type ProductCategory = Product["category"];

export type ProductInput = {
  name: string;
  sku?: string | null;
  category: ProductCategory;
  price: number;
  cost: number;
  stock_qty: number;
  low_stock_threshold?: number;
  barcode?: string | null;
  is_active?: boolean;
};

const CATEGORIES: ProductCategory[] = [
  "merchandise",
  "balls",
  "paddles",
  "food",
  "drinks",
  "other",
];

export function normalizeCategory(value: string): ProductCategory {
  return CATEGORIES.includes(value as ProductCategory)
    ? (value as ProductCategory)
    : "other";
}

export function mapMerchToProduct(row: MerchRow): Product {
  return {
    id: row.id,
    branch_id: row.branch_id,
    name: row.name,
    sku: row.sku ?? "",
    category: normalizeCategory(row.category),
    price: row.price_cents / 100,
    cost: row.cost_cents / 100,
    stock_qty: row.stock_qty,
    low_stock_threshold: row.low_stock_threshold,
    barcode: row.barcode,
    image_url: row.image_url,
    is_active: row.active,
    created_at: row.created_at,
  };
}

function pesosToCents(value: number) {
  return Math.max(0, Math.round(value * 100));
}

export async function listProducts(client: Client, branchId: string) {
  const { data, error } = await client
    .from("merchandise_products")
    .select("*")
    .eq("branch_id", branchId)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMerchToProduct);
}

export async function listActiveProducts(client: Client, branchId: string) {
  const { data, error } = await client
    .from("merchandise_products")
    .select("*")
    .eq("branch_id", branchId)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapMerchToProduct);
}

export async function createProduct(
  client: Client,
  branchId: string,
  input: ProductInput
) {
  const payload = {
    branch_id: branchId,
    name: input.name.trim(),
    sku: input.sku?.trim() || null,
    category: input.category,
    price_cents: pesosToCents(input.price),
    cost_cents: pesosToCents(input.cost),
    stock_qty: Math.max(0, Math.round(input.stock_qty)),
    low_stock_threshold: Math.max(0, Math.round(input.low_stock_threshold ?? 5)),
    barcode: input.barcode?.trim() || null,
    active: input.is_active ?? true,
  };

  const { data, error } = await client
    .from("merchandise_products")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapMerchToProduct(data);
}

export async function updateProduct(
  client: Client,
  productId: string,
  input: Partial<ProductInput>
) {
  const payload: Database["public"]["Tables"]["merchandise_products"]["Update"] =
    {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.sku !== undefined) payload.sku = input.sku?.trim() || null;
  if (input.category !== undefined) payload.category = input.category;
  if (input.price !== undefined) payload.price_cents = pesosToCents(input.price);
  if (input.cost !== undefined) payload.cost_cents = pesosToCents(input.cost);
  if (input.stock_qty !== undefined) {
    payload.stock_qty = Math.max(0, Math.round(input.stock_qty));
  }
  if (input.low_stock_threshold !== undefined) {
    payload.low_stock_threshold = Math.max(
      0,
      Math.round(input.low_stock_threshold)
    );
  }
  if (input.barcode !== undefined) payload.barcode = input.barcode?.trim() || null;
  if (input.is_active !== undefined) payload.active = input.is_active;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("merchandise_products")
    .update(payload)
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return mapMerchToProduct(data);
}
