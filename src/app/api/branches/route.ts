import { NextResponse } from "next/server";
import { requireStaffApiActor } from "@/lib/auth/require-staff-api";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapBranchRow } from "@/services/branches";

export async function GET() {
  const gate = await requireStaffApiActor();
  if ("error" in gate && gate.error) return gate.error;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    const branches = (data ?? []).map(mapBranchRow);
    return NextResponse.json({ data: branches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load branches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
