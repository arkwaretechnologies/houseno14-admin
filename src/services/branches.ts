import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Branch } from "@/types";

type Client = SupabaseClient<Database>;
type BranchRow = Database["public"]["Tables"]["branches"]["Row"];

export function mapBranchRow(row: BranchRow): Branch {
  return {
    id: row.id,
    name: row.name,
    code: row.slug,
    address: row.address,
    phone: row.phone,
    email: row.email,
    timezone: row.timezone ?? "Asia/Manila",
    is_active: row.is_active ?? true,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function listBranches(client: Client) {
  const { data, error } = await client
    .from("branches")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(mapBranchRow);
}

export type UpdateBranchInput = {
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export async function updateBranch(
  client: Client,
  branchId: string,
  input: UpdateBranchInput
): Promise<Branch> {
  const { data, error } = await client
    .from("branches")
    .update({
      name: input.name.trim(),
      slug: input.code.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", branchId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error(
        "Branch was not updated. You may not have permission to edit this branch."
      );
    }
    throw error;
  }
  if (!data) {
    throw new Error("Branch was not updated.");
  }
  return mapBranchRow(data);
}
