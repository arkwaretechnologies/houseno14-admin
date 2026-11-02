import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Member, PaginatedResult } from "@/types";
import { PAGE_SIZE } from "@/lib/constants";

type Client = SupabaseClient<Database>;

/**
 * Members in the shared backend are `profiles` with role = 'member'.
 * This service maps them into the admin Member view model.
 */
export async function listMembers(
  client: Client,
  opts: {
    branchId?: string;
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<PaginatedResult<Member>> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = client
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "member")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (opts.branchId) query = query.eq("branch_id", opts.branchId);
  if (opts.search) {
    query = query.or(
      `full_name.ilike.%${opts.search}%,phone.ilike.%${opts.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped: Member[] = (data ?? []).map((row) => ({
    id: row.id,
    branch_id: row.branch_id ?? "",
    member_code: row.id.slice(0, 8).toUpperCase(),
    full_name: row.full_name ?? "Unknown",
    email: null,
    phone: row.phone,
    avatar_url: row.avatar_url,
    date_of_birth: null,
    gender: row.gender,
    status: "active",
    rfid_tag: null,
    elo_rating: row.elo_rating,
    wallet_balance: 0,
    notes: null,
    joined_at: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  return {
    data: mapped,
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function updateMemberProfile(
  client: Client,
  id: string,
  payload: Database["public"]["Tables"]["profiles"]["Update"]
) {
  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function assignRfid(
  client: Client,
  profileId: string,
  cardUid: string,
  branchId: string
) {
  const { data, error } = await (client as SupabaseClient).rpc("assign_rfid", {
    p_profile_id: profileId,
    p_card_uid: cardUid,
    p_branch_id: branchId,
  });
  if (error) throw error;
  return data;
}
