import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import { listActiveProducts } from "@/services/products";

type Client = SupabaseClient<Database>;

export type ShopPaymentMethod = Extract<
  Database["public"]["Enums"]["walk_in_payment_method"],
  "cash" | "card" | "gcash" | "other"
>;

export type ShopCartItem = {
  product_id: string;
  quantity: number;
};

export type ShopSale = Database["public"]["Functions"]["complete_shop_sale"]["Returns"];

export type CompleteShopSaleInput = {
  branchId: string;
  items: ShopCartItem[];
  paymentMethod: ShopPaymentMethod;
  amountTenderedCents?: number;
  profileId?: string | null;
};

export { listActiveProducts as listShopProducts };

export async function completeShopSale(
  client: Client,
  input: CompleteShopSaleInput
) {
  const itemsJson = input.items.map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  })) as unknown as Json;

  const { data, error } = await client.rpc("complete_shop_sale", {
    p_branch_id: input.branchId,
    p_items: itemsJson,
    p_payment_method: input.paymentMethod,
    p_amount_tendered_cents: input.amountTenderedCents,
    p_profile_id: input.profileId ?? undefined,
  });

  if (error) throw error;
  return data as ShopSale;
}
