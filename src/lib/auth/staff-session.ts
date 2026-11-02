import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { StaffRole } from "@/lib/constants";
import type { Branch, StaffProfile } from "@/types";

type Client = SupabaseClient<Database>;

function mapBranchFromRow(row: {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}): Branch {
  return {
    id: row.id,
    name: row.name,
    code: row.slug,
    address: row.address,
    phone: row.phone,
    email: row.email,
    timezone: row.timezone ?? "Asia/Manila",
    is_active: true,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export type StaffSessionPayload = {
  staff: StaffProfile;
  branch: Branch | null;
};

export async function loadStaffSessionFromSupabase(
  client: Client,
  authUserId: string,
  email: string
): Promise<StaffSessionPayload | null> {
  const { data: profile, error } = await client
    .from("profiles")
    .select("*, branch:branches(*)")
    .eq("id", authUserId)
    .maybeSingle();

  if (error || !profile) return null;

  if (profile.role !== "staff" && profile.role !== "admin") {
    return null;
  }

  if ((profile.status ?? "active") !== "active") {
    return null;
  }

  const adminRole =
    (profile.admin_role as StaffRole | null) ??
    (profile.role === "admin" ? "super_admin" : "receptionist");

  const branchRow = Array.isArray(profile.branch)
    ? profile.branch[0]
    : profile.branch;

  const branch = branchRow ? mapBranchFromRow(branchRow) : null;

  const staff: StaffProfile = {
    id: profile.id,
    auth_user_id: profile.id,
    branch_id: profile.branch_id,
    email,
    full_name: profile.full_name ?? "Staff",
    role: adminRole,
    avatar_url: profile.avatar_url,
    phone: profile.phone,
    is_active: true,
    last_login_at: profile.last_login_at,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    branch,
  };

  return { staff, branch };
}
