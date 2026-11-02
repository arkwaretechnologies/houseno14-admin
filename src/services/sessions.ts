import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { MatchingStyle } from "@/lib/constants";

type Client = SupabaseClient<Database>;

export type OpenPlaySessionStatus = Database["public"]["Enums"]["open_play_session_status"];

export type SessionCourtEmbed = {
  court_id: string;
  court: {
    id: string;
    name: string;
    status: string;
    is_open_play: boolean;
  } | null;
};

export type OpenPlaySessionRow = Database["public"]["Tables"]["open_play_sessions"]["Row"] & {
  court?: {
    id: string;
    name: string;
  } | null;
  session_courts?: SessionCourtEmbed[];
};

export type CreateScheduledSessionInput = {
  branchId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  maxPlayers: number;
  matchingStyle: MatchingStyle;
  styleConfig?: Record<string, unknown>;
  courtIds?: string[];
};

const SESSION_LIST_SELECT =
  "*, court:courts!open_play_sessions_court_id_fkey(id, name), session_courts:open_play_session_courts!open_play_session_courts_session_id_fk(court_id, court:courts!open_play_session_courts_court_id_fkey(id, name, status, is_open_play))";

export async function activateDueSessions(client: Client, branchId?: string) {
  const { data, error } = await client.rpc("activate_due_open_play_sessions", {
    p_branch_id: branchId ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function listOpenPlaySessions(
  client: Client,
  branchId: string,
  options?: { from?: string; to?: string }
) {
  let query = client
    .from("open_play_sessions")
    .select(SESSION_LIST_SELECT)
    .eq("branch_id", branchId)
    .order("starts_at", { ascending: true });

  if (options?.from) {
    query = query.gte("starts_at", options.from);
  }
  if (options?.to) {
    query = query.lte("starts_at", options.to);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as OpenPlaySessionRow[];
}

export async function createScheduledSession(
  client: Client,
  input: CreateScheduledSessionInput
) {
  const { data, error } = await client.rpc("create_scheduled_open_play_session", {
    p_branch_id: input.branchId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_max_players: input.maxPlayers,
    p_matching_style: input.matchingStyle,
    p_style_config: (input.styleConfig ?? {}) as Json,
    p_court_ids: input.courtIds?.length ? input.courtIds : undefined,
  });
  if (error) throw new Error(error.message);
  return data as OpenPlaySessionRow;
}

export async function setSessionCourts(
  client: Client,
  sessionId: string,
  courtIds: string[]
) {
  const { data, error } = await client.rpc("set_open_play_session_courts", {
    p_session_id: sessionId,
    p_court_ids: courtIds,
  });
  if (error) throw new Error(error.message);
  return data as OpenPlaySessionRow;
}

export async function cancelScheduledSession(client: Client, sessionId: string) {
  const { data, error } = await client.rpc("cancel_scheduled_open_play_session", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  return data as OpenPlaySessionRow;
}

export function sessionCourtNames(session: OpenPlaySessionRow): string {
  const names = (session.session_courts ?? [])
    .map((sc) => sc.court?.name)
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return "No courts assigned";
  return names.join(", ");
}
