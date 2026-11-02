import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StaffRole } from "@/lib/constants";
import type { StaffProfile } from "@/types";

type Client = SupabaseClient<Database>;
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function mapProfileToStaff(
  row: ProfileRow,
  email: string
): StaffProfile {
  const adminRole = row.admin_role ?? "receptionist";
  return {
    id: row.id,
    auth_user_id: row.id,
    branch_id: row.branch_id,
    email,
    full_name: row.full_name ?? "Staff",
    role: adminRole as StaffRole,
    avatar_url: row.avatar_url,
    phone: row.phone,
    is_active: (row.status ?? "active") === "active",
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listStaffProfiles(
  client: Client,
  branchId?: string | null
): Promise<StaffProfile[]> {
  let query = client
    .from("profiles")
    .select("*")
    .in("role", ["staff", "admin"])
    .order("full_name", { ascending: true });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) =>
    mapProfileToStaff(row, "")
  );
}
