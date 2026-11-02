import { NextResponse } from "next/server";
import type { StaffRole } from "@/lib/constants";
import { requireStaffApiActor } from "@/lib/auth/require-staff-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapProfileToStaff } from "@/services/staff";
import { staffMemberSchema } from "@/lib/validations";

type StaffManagerGate =
  | { error: NextResponse }
  | {
      actor: {
        admin_role: StaffRole;
        role: "member" | "staff" | "admin";
        branch_id: string | null;
        status: string;
      };
      userId: string;
    };

async function requireStaffManager(): Promise<StaffManagerGate> {
  const gate = await requireStaffApiActor({
    allowRoles: ["super_admin", "manager"],
  });
  if ("error" in gate) {
    return { error: gate.error as NextResponse };
  }

  const adminRole = gate.profile.admin_role as StaffRole;
  if (!["super_admin", "manager"].includes(adminRole)) {
    return {
      error: NextResponse.json(
        { error: "Only Super Admin or Manager can manage staff" },
        { status: 403 }
      ),
    };
  }

  return { actor: gate.profile, userId: gate.user.id };
}

function profileRoleForAdminRole(adminRole: StaffRole): "staff" | "admin" {
  return adminRole === "super_admin" ? "admin" : "staff";
}

export async function GET(request: Request) {
  const gate = await requireStaffManager();
  if ("error" in gate) return gate.error;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id") ?? gate.actor.branch_id;

  try {
    const admin = createAdminClient();
    let query = admin
      .from("profiles")
      .select("*")
      .in("role", ["staff", "admin"])
      .order("full_name", { ascending: true });

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const staff = await Promise.all(
      (rows ?? []).map(async (row) => {
        const { data: authUser } = await admin.auth.admin.getUserById(row.id);
        const email = authUser.user?.email ?? "";
        return mapProfileToStaff(row, email);
      })
    );

    return NextResponse.json({ data: staff });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const gate = await requireStaffManager();
  if ("error" in gate) return gate.error;

  const actor = gate.actor;
  const actorRole = actor.admin_role as StaffRole;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = staffMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (
    actorRole === "manager" &&
    (input.admin_role === "super_admin" || input.admin_role === "manager")
  ) {
    return NextResponse.json(
      { error: "Managers can only add Cashier, Receptionist, or Coach roles" },
      { status: 403 }
    );
  }

  if (
    actorRole === "manager" &&
    actor.branch_id &&
    input.branch_id !== actor.branch_id
  ) {
    return NextResponse.json(
      { error: "Managers can only add staff to their own branch" },
      { status: 403 }
    );
  }

  try {
    const admin = createAdminClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      new URL(request.url).origin;
    const redirectTo = `${appUrl}/login`;

    let userId: string;
    const email = input.email.trim().toLowerCase();

    if (input.mode === "create") {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.full_name },
      });
      if (error) throw error;
      if (!data.user) throw new Error("User was not created");
      userId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { full_name: input.full_name },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Invite was not sent");
      userId = data.user.id;
    }

    const profilePayload = {
      id: userId,
      full_name: input.full_name.trim(),
      phone: input.phone?.trim() || null,
      role: profileRoleForAdminRole(input.admin_role),
      admin_role: input.admin_role,
      branch_id: input.branch_id,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) throw profileError;

    const staff = mapProfileToStaff(profile, email);

    return NextResponse.json({
      data: staff,
      message:
        input.mode === "invite"
          ? "Invitation email sent"
          : "Staff account created",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add staff";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
