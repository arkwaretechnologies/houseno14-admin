import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { SkillLevel } from "@/lib/constants";

type Client = SupabaseClient<Database>;

export type RegistrationStatus =
  Database["public"]["Enums"]["open_play_registration_status"];

export type OpenPlayRegistrationRow =
  Database["public"]["Tables"]["open_play_registrations"]["Row"] & {
    profile?: { id: string; full_name: string | null } | null;
    walk_in?: { id: string; full_name: string } | null;
  };

export async function listSessionRegistrations(
  client: Client,
  sessionId: string
) {
  const { data, error } = await client
    .from("open_play_registrations")
    .select(
      "*, profile:profiles!open_play_registrations_profile_id_fkey(id, full_name), walk_in:players!open_play_registrations_walk_in_id_fkey(id, full_name)"
    )
    .eq("session_id", sessionId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as OpenPlayRegistrationRow[];
}

export async function addMemberRegistration(
  client: Client,
  input: {
    sessionId: string;
    profileId: string;
    gender?: "male" | "female" | null;
    skillLevel?: SkillLevel | null;
  }
) {
  const { data, error } = await client.rpc("add_open_play_registration_member", {
    p_session_id: input.sessionId,
    p_profile_id: input.profileId,
    p_gender: input.gender ?? undefined,
    p_skill_level: input.skillLevel ?? undefined,
  });
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}

export async function addWalkInRegistration(
  client: Client,
  input: {
    sessionId: string;
    fullName: string;
    gender: "male" | "female";
    skillLevel: SkillLevel;
    phone?: string;
  }
) {
  const { data, error } = await client.rpc(
    "add_open_play_registration_walk_in",
    {
      p_session_id: input.sessionId,
      p_full_name: input.fullName,
      p_gender: input.gender,
      p_skill_level: input.skillLevel,
      p_phone: input.phone,
    }
  );
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}

export async function addPlayerRegistration(
  client: Client,
  sessionId: string,
  playerId: string
) {
  const { data, error } = await client.rpc(
    "add_open_play_registration_player",
    {
      p_session_id: sessionId,
      p_player_id: playerId,
    }
  );
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}

export async function cancelRegistration(client: Client, registrationId: string) {
  const { data, error } = await client.rpc("cancel_open_play_registration", {
    p_registration_id: registrationId,
  });
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}

export async function checkInRegistration(
  client: Client,
  registrationId: string
) {
  const { data, error } = await client.rpc("check_in_open_play_registration", {
    p_registration_id: registrationId,
  });
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}

export async function payRegistration(
  client: Client,
  registrationId: string,
  input: {
    paymentMethod: Database["public"]["Enums"]["walk_in_payment_method"];
    amountTenderedCents?: number | null;
  }
) {
  const { data, error } = await client.rpc("pay_open_play_registration", {
    p_registration_id: registrationId,
    p_payment_method: input.paymentMethod,
    p_amount_tendered_cents: input.amountTenderedCents ?? undefined,
  });
  if (error) throw error;
  return data as OpenPlayRegistrationRow;
}
