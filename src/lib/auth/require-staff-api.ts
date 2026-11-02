import { NextResponse } from "next/server";
import type { StaffRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function requireStaffApiActor(options?: {
  allowRoles?: StaffRole[];
}) {
  const allowed = options?.allowRoles ?? [
    "super_admin",
    "manager",
    "cashier",
    "receptionist",
    "coach",
  ];

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" },
        { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("admin_role, role, branch_id, status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      error: NextResponse.json({ error: "Profile not found" }, { status: 403 }),
    };
  }

  if (profile.role !== "staff" && profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Staff access only" },
        { status: 403 }
      ),
    };
  }

  if ((profile.status ?? "active") !== "active") {
    return {
      error: NextResponse.json({ error: "Account is not active" }, { status: 403 }),
    };
  }

  const adminRole =
    (profile.admin_role as StaffRole | null) ??
    (profile.role === "admin" ? "super_admin" : "receptionist");

  if (!allowed.includes(adminRole)) {
    return {
      error: NextResponse.json({ error: "Insufficient permissions" }, {
        status: 403,
      }),
    };
  }

  return { user, profile: { ...profile, admin_role: adminRole } };
}
