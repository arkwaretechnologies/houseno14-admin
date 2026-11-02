import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { OpenPlayPlayer } from "@/types";
import type { SkillLevel } from "@/lib/constants";

type Client = SupabaseClient<Database>;
type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

export type PlayerInput = {
  fullName: string;
  gender: "male" | "female";
  skillLevel: SkillLevel;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

export function mapPlayerRow(row: PlayerRow): OpenPlayPlayer {
  return {
    id: row.id,
    branch_id: row.branch_id,
    full_name: row.full_name,
    gender: (row.gender ?? "male") as "male" | "female",
    skill_level: row.skill_level ?? "intermediate",
    address: row.address ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at ?? null,
  };
}

export type SearchPlayersResult = {
  players: OpenPlayPlayer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function searchPlayers(
  client: Client,
  branchId: string,
  query = "",
  opts?: { page?: number; pageSize?: number }
): Promise<SearchPlayersResult> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = opts?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const [listRes, countRes] = await Promise.all([
    client.rpc("search_open_play_players", {
      p_branch_id: branchId,
      p_query: query,
      p_limit: pageSize,
      p_offset: offset,
    }),
    client.rpc("count_open_play_players", {
      p_branch_id: branchId,
      p_query: query,
    }),
  ]);

  if (listRes.error) throw listRes.error;
  if (countRes.error) throw countRes.error;

  const total = Number(countRes.data ?? 0);
  return {
    players: ((listRes.data ?? []) as PlayerRow[]).map(mapPlayerRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function createPlayer(
  client: Client,
  branchId: string,
  input: PlayerInput
) {
  const { data, error } = await client.rpc("create_open_play_player", {
    p_branch_id: branchId,
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_skill_level: input.skillLevel,
    p_address: input.address ?? undefined,
    p_phone: input.phone ?? undefined,
    p_email: input.email ?? undefined,
  });
  if (error) throw error;
  return mapPlayerRow(data as PlayerRow);
}

export async function updatePlayer(
  client: Client,
  playerId: string,
  input: PlayerInput
) {
  const { data, error } = await client.rpc("update_open_play_player", {
    p_player_id: playerId,
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_skill_level: input.skillLevel,
    p_address: input.address ?? undefined,
    p_phone: input.phone ?? undefined,
    p_email: input.email ?? undefined,
  });
  if (error) throw error;
  return mapPlayerRow(data as PlayerRow);
}

export async function deletePlayer(client: Client, playerId: string) {
  const { data, error } = await client
    .from("players")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", playerId)
    .select()
    .single();
  if (error) throw error;
  return mapPlayerRow(data);
}

export async function addPlayerToSchedule(
  client: Client,
  sessionId: string,
  playerId: string
) {
  const { data, error } = await client.rpc("add_open_play_registration_player", {
    p_session_id: sessionId,
    p_player_id: playerId,
  });
  if (error) throw error;
  return data;
}

export async function addPlayerToQueue(
  client: Client,
  sessionId: string,
  playerId: string,
  payment?: {
    paymentMethod: Database["public"]["Enums"]["walk_in_payment_method"];
    amountTenderedCents?: number | null;
  }
) {
  const { data, error } = await client.rpc("register_player_open_play", {
    p_session_id: sessionId,
    p_player_id: playerId,
    p_payment_method: payment?.paymentMethod,
    p_amount_tendered_cents: payment?.amountTenderedCents ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}
