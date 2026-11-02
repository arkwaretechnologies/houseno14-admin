import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type BranchServiceType = Database["public"]["Enums"]["branch_service_type"];
export type BranchServiceBillingUnit =
  Database["public"]["Enums"]["branch_service_billing_unit"];

export type BranchService = Database["public"]["Tables"]["branch_services"]["Row"];
export type BranchSettings = Database["public"]["Tables"]["branch_settings"]["Row"];

export type BranchServiceInput = {
  name: string;
  description?: string | null;
  service_type: BranchServiceType;
  price_cents: number;
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
};

export type BranchFeeDefaults = {
  walk_in_open_play_fee_cents: number;
  default_open_play_fee_cents: number;
  exclusive_court_fee_cents: number;
  walk_in_exclusive_fee_cents: number;
};

function billingUnitForType(type: BranchServiceType): BranchServiceBillingUnit {
  return type === "open_play" ? "per_session" : "per_hour";
}

export async function listBranchServices(client: Client, branchId: string) {
  const { data, error } = await client
    .from("branch_services")
    .select("*")
    .eq("branch_id", branchId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as BranchService[];
}

export async function createBranchService(
  client: Client,
  branchId: string,
  input: BranchServiceInput
) {
  const payload = {
    branch_id: branchId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    service_type: input.service_type,
    billing_unit: billingUnitForType(input.service_type),
    price_cents: Math.max(0, Math.round(input.price_cents)),
    is_active: input.is_active ?? true,
    is_default: false,
    sort_order: input.sort_order ?? 0,
  };

  const { data, error } = await client
    .from("branch_services")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  if (input.is_default) {
    return setDefaultBranchService(client, data.id);
  }

  return data as BranchService;
}

export async function updateBranchService(
  client: Client,
  serviceId: string,
  input: Partial<BranchServiceInput> & { service_type?: BranchServiceType }
) {
  const patch: Database["public"]["Tables"]["branch_services"]["Update"] = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.service_type !== undefined) {
    patch.service_type = input.service_type;
    patch.billing_unit = billingUnitForType(input.service_type);
  }
  if (input.price_cents !== undefined) {
    patch.price_cents = Math.max(0, Math.round(input.price_cents));
  }
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await client
    .from("branch_services")
    .update(patch)
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) throw error;

  if (input.is_default) {
    return setDefaultBranchService(client, serviceId);
  }

  // Keep branch_settings aligned when editing an existing default.
  if (data.is_default && input.price_cents !== undefined) {
    await syncBranchFeesFromService(client, data);
  }

  return data as BranchService;
}

export async function setDefaultBranchService(client: Client, serviceId: string) {
  const { data, error } = await client.rpc("set_default_branch_service", {
    p_service_id: serviceId,
  });
  if (error) throw error;
  return data as BranchService;
}

export async function setBranchServiceActive(
  client: Client,
  serviceId: string,
  isActive: boolean
) {
  if (!isActive) {
    const { data: existing, error: fetchError } = await client
      .from("branch_services")
      .select("is_default")
      .eq("id", serviceId)
      .single();
    if (fetchError) throw fetchError;
    if (existing?.is_default) {
      throw new Error("Set another default before deactivating this service");
    }
  }

  const { data, error } = await client
    .from("branch_services")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", serviceId)
    .select("*")
    .single();

  if (error) throw error;
  return data as BranchService;
}

export async function deleteBranchService(client: Client, serviceId: string) {
  const { data: existing, error: fetchError } = await client
    .from("branch_services")
    .select("is_default, is_active")
    .eq("id", serviceId)
    .single();
  if (fetchError) throw fetchError;
  if (existing?.is_default) {
    throw new Error("Cannot delete the default service");
  }
  if (existing?.is_active) {
    throw new Error("Deactivate the service before deleting");
  }

  const { error } = await client.from("branch_services").delete().eq("id", serviceId);
  if (error) throw error;
}

async function syncBranchFeesFromService(client: Client, svc: BranchService) {
  const fees: Partial<BranchFeeDefaults> =
    svc.service_type === "open_play"
      ? {
          walk_in_open_play_fee_cents: svc.price_cents,
          default_open_play_fee_cents: svc.price_cents,
        }
      : {
          exclusive_court_fee_cents: svc.price_cents,
          walk_in_exclusive_fee_cents: svc.price_cents,
        };

  await upsertBranchFeeDefaults(client, svc.branch_id, fees);
}

export async function getBranchFeeDefaults(client: Client, branchId: string) {
  const { data, error } = await client
    .from("branch_settings")
    .select(
      "branch_id, walk_in_open_play_fee_cents, default_open_play_fee_cents, exclusive_court_fee_cents, walk_in_exclusive_fee_cents, updated_at"
    )
    .eq("branch_id", branchId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      branch_id: branchId,
      walk_in_open_play_fee_cents: 0,
      default_open_play_fee_cents: 0,
      exclusive_court_fee_cents: 0,
      walk_in_exclusive_fee_cents: 0,
      updated_at: new Date().toISOString(),
    } satisfies Pick<
      BranchSettings,
      | "branch_id"
      | "walk_in_open_play_fee_cents"
      | "default_open_play_fee_cents"
      | "exclusive_court_fee_cents"
      | "walk_in_exclusive_fee_cents"
      | "updated_at"
    >;
  }

  return data;
}

export async function upsertBranchFeeDefaults(
  client: Client,
  branchId: string,
  fees: Partial<BranchFeeDefaults>
) {
  const now = new Date().toISOString();
  const payload = {
    branch_id: branchId,
    ...fees,
    updated_at: now,
  };

  const { data, error } = await client
    .from("branch_settings")
    .upsert(payload, { onConflict: "branch_id" })
    .select(
      "branch_id, walk_in_open_play_fee_cents, default_open_play_fee_cents, exclusive_court_fee_cents, walk_in_exclusive_fee_cents, updated_at"
    )
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourtHourlyRate(
  client: Client,
  courtId: string,
  hourlyRateCents: number
) {
  const { error } = await client
    .from("courts")
    .update({
      hourly_rate_cents: Math.max(0, Math.round(hourlyRateCents)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId);

  if (error) throw error;
}
