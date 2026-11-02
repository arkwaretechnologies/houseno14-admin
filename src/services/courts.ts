import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Court } from "@/types";
import type { CourtStatus, SkillLevel } from "@/lib/constants";

type Client = SupabaseClient<Database>;

type CourtRow = Database["public"]["Tables"]["courts"]["Row"];

export function mapCourtRow(row: CourtRow): Court {
  return {
    id: row.id,
    branch_id: row.branch_id,
    name: row.name,
    code: row.name.replace(/^Court\s+/i, "") || row.name,
    status: row.status as CourtStatus,
    capacity: row.capacity ?? 4,
    is_exclusive: row.is_exclusive ?? false,
    is_open_play: row.is_open_play ?? true,
    hourly_rate: Math.round((row.hourly_rate_cents ?? 0) / 100),
    image_url: row.image_url,
    operating_hours:
      (row.operating_hours as Court["operating_hours"]) ?? {},
    notes: row.notes,
    skill_level: row.skill_level,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export async function listCourts(client: Client, branchId?: string) {
  let query = client
    .from("courts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (branchId) {
    query = query.eq("branch_id", branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCourtRow);
}

export async function updateCourtStatus(
  client: Client,
  courtId: string,
  status: CourtStatus
) {
  const { error } = await client
    .from("courts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", courtId);
  if (error) throw error;
}

export async function updateCourtSkillLevel(
  client: Client,
  courtId: string,
  skillLevel: SkillLevel | null
) {
  const { error } = await client
    .from("courts")
    .update({
      skill_level: skillLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courtId);
  if (error) throw error;
}

export type CourtMode = "open_play" | "exclusive";

export async function updateCourtMode(
  client: Client,
  courtId: string,
  mode: CourtMode
) {
  const isExclusive = mode === "exclusive";
  const { data, error } = await (client as SupabaseClient).rpc(
    "update_court_mode",
    {
      p_court_id: courtId,
      p_is_exclusive: isExclusive,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Court mode was not saved.");
  }
  return mapCourtRow(data as CourtRow);
}

export async function deleteCourt(client: Client, courtId: string) {
  const { data, error } = await client
    .from("courts")
    .delete()
    .eq("id", courtId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new Error(
      "Court was not deleted. You may not have permission, or it is still in use."
    );
  }
}

export type TvCourtBoardRow = {
  court_id: string;
  court_name: string;
  court_code: string;
  court_status: CourtStatus;
  sort_order: number;
  match_id: string | null;
  match_status: "assigned" | "active" | null;
  team_a: string[];
  team_b: string[];
};

/** Lobby TV board: courts + active match player names (SECURITY DEFINER RPC). */
export async function listTvCourtBoard(
  client: Client,
  branchId?: string | null
): Promise<TvCourtBoardRow[]> {
  const { data, error } = await (client as SupabaseClient).rpc(
    "tv_court_match_board",
    { p_branch_id: branchId ?? null }
  );
  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    court_id: row.court_id as string,
    court_name: row.court_name as string,
    court_code: (row.court_code as string) || (row.court_name as string),
    court_status: row.court_status as CourtStatus,
    sort_order: (row.sort_order as number) ?? 0,
    match_id: (row.match_id as string | null) ?? null,
    match_status: (row.match_status as "assigned" | "active" | null) ?? null,
    team_a: (row.team_a as string[] | null) ?? [],
    team_b: (row.team_b as string[] | null) ?? [],
  }));
}

export type TvNextMatch = {
  id: string;
  source: "assigned" | "preview";
  status: string;
  court_name: string | null;
  team_a: string[];
  team_b: string[];
};

export type TvWaitingPlayer = {
  id: string;
  full_name: string;
  priority: number;
  position: number | null;
};

export type TvLobbyQueueBoard = {
  session_id: string | null;
  matching_style: string;
  next_matches: TvNextMatch[];
  waiting: TvWaitingPlayer[];
};

/** Lobby TV queue: next 3 paired matches + remaining waiting list. */
export async function listTvLobbyQueueBoard(
  client: Client,
  branchId?: string | null
): Promise<TvLobbyQueueBoard> {
  const { data, error } = await (client as SupabaseClient).rpc(
    "tv_lobby_queue_board",
    { p_branch_id: branchId ?? null }
  );
  if (error) throw new Error(error.message);

  const payload = (data ?? {}) as Record<string, unknown>;
  const nextMatches = (payload.next_matches as Array<Record<string, unknown>> | null) ?? [];
  const waiting = (payload.waiting as Array<Record<string, unknown>> | null) ?? [];

  return {
    session_id: (payload.session_id as string | null) ?? null,
    matching_style: (payload.matching_style as string) ?? "auto_balanced",
    next_matches: nextMatches.map((m) => ({
      id: String(m.id),
      source: m.source === "assigned" ? "assigned" : "preview",
      status: String(m.status ?? "preview"),
      court_name: (m.court_name as string | null) ?? null,
      team_a: Array.isArray(m.team_a) ? (m.team_a as string[]) : [],
      team_b: Array.isArray(m.team_b) ? (m.team_b as string[]) : [],
    })),
    waiting: waiting.map((w, i) => ({
      id: String(w.id),
      full_name: String(w.full_name ?? "Player"),
      priority: Number(w.priority ?? 0),
      position: (w.position as number | null) ?? i + 1,
    })),
  };
}
