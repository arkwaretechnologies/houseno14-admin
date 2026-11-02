import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { QueueEntry, Match } from "@/types";
import type { MatchingStyle, QueueLane, SkillLevel } from "@/lib/constants";
import {
  activateDueSessions,
  type OpenPlaySessionRow,
} from "@/services/sessions";
import { mapCourtRow } from "@/services/courts";

type Client = SupabaseClient<Database>;
type CourtRow = Database["public"]["Tables"]["courts"]["Row"];

export type { OpenPlaySessionRow };

export type QueueSessionCourt = {
  court_id: string;
  court: {
    id: string;
    name: string;
    status: string;
    is_open_play: boolean;
  } | null;
};

export type QueueSessionCard = OpenPlaySessionRow & {
  session_courts: QueueSessionCourt[];
  waiting_count: number;
};

export type LiveQueueRow = {
  id: string;
  session_id: string;
  profile_id: string | null;
  walk_in_id: string | null;
  status: string;
  joined_at: string;
  position: number | null;
  priority: number;
  paused: boolean;
  lane: string;
  skill_level: SkillLevel | null;
  gender: "male" | "female" | null;
  profile?: {
    id: string;
    full_name: string | null;
    elo_rating: number;
    skill_level: SkillLevel | null;
    gender: "male" | "female" | null;
    avatar_url: string | null;
  } | null;
  walk_in?: {
    id: string;
    full_name: string;
  } | null;
};

export async function getActiveOpenPlaySession(client: Client, branchId?: string) {
  await activateDueSessions(client, branchId);

  const nowIso = new Date().toISOString();

  // Prefer an open session whose window contains now (earliest starts_at).
  let inWindowOpenQuery = (client as SupabaseClient)
    .from("open_play_sessions")
    .select("*")
    .eq("status", "open")
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(1);

  if (branchId) {
    inWindowOpenQuery = inWindowOpenQuery.eq("branch_id", branchId);
  }

  const { data: inWindowOpen, error: inWindowOpenError } =
    await inWindowOpenQuery.maybeSingle();
  if (inWindowOpenError) throw inWindowOpenError;
  if (inWindowOpen) return inWindowOpen as OpenPlaySessionRow;

  // Fallback: any other open session (latest started).
  let openQuery = (client as SupabaseClient)
    .from("open_play_sessions")
    .select("*")
    .eq("status", "open")
    .order("started_at", { ascending: false })
    .limit(1);

  if (branchId) {
    openQuery = openQuery.eq("branch_id", branchId);
  }

  const { data: openSession, error: openError } = await openQuery.maybeSingle();
  if (openError) throw openError;
  if (openSession) return openSession as OpenPlaySessionRow;

  // Fallback: scheduled session whose window includes now.
  let scheduledQuery = (client as SupabaseClient)
    .from("open_play_sessions")
    .select("*")
    .eq("status", "scheduled")
    .lte("starts_at", nowIso)
    .gt("ends_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(1);

  if (branchId) {
    scheduledQuery = scheduledQuery.eq("branch_id", branchId);
  }

  const { data: scheduledSession, error: scheduledError } =
    await scheduledQuery.maybeSingle();
  if (scheduledError) throw scheduledError;
  return (scheduledSession as OpenPlaySessionRow | null) ?? null;
}

export async function listSelectableOpenPlaySessions(
  client: Client,
  branchId: string
): Promise<QueueSessionCard[]> {
  try {
    await activateDueSessions(client, branchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Read-only views (e.g. dashboard) should still list sessions if activation is staff-only.
    if (message !== "Staff only") throw err;
  }

  const { data, error } = await (client as SupabaseClient)
    .from("open_play_sessions")
    .select(
      "*, session_courts:open_play_session_courts!open_play_session_courts_session_id_fk(court_id, court:courts!open_play_session_courts_court_id_fkey(id, name, status, is_open_play))"
    )
    .eq("branch_id", branchId)
    .in("status", ["open", "scheduled"])
    .order("starts_at", { ascending: true });

  if (error) throw new Error(error.message);

  const now = Date.now();
  const sessions = ((data ?? []) as QueueSessionCard[]).filter((s) => {
    if (s.status === "open") return true;
    if (s.status === "scheduled") {
      const starts = new Date(s.starts_at).getTime();
      const ends = new Date(s.ends_at).getTime();
      return starts <= now && now < ends;
    }
    return false;
  });

  if (sessions.length === 0) return [];

  const ids = sessions.map((s) => s.id);
  const { data: waitingRows, error: waitingError } = await (client as SupabaseClient)
    .from("open_play_queue")
    .select("session_id")
    .in("session_id", ids)
    .eq("status", "waiting");

  if (waitingError) throw waitingError;

  const waitingBySession = new Map<string, number>();
  for (const row of waitingRows ?? []) {
    const sid = (row as { session_id: string }).session_id;
    waitingBySession.set(sid, (waitingBySession.get(sid) ?? 0) + 1);
  }

  return sessions.map((s) => ({
    ...s,
    session_courts: s.session_courts ?? [],
    waiting_count: waitingBySession.get(s.id) ?? 0,
  }));
}

export function pickDefaultQueueSession(
  sessions: QueueSessionCard[]
): QueueSessionCard | null {
  if (sessions.length === 0) return null;
  const now = Date.now();
  const inWindowOpen = sessions
    .filter((s) => {
      if (s.status !== "open") return false;
      const starts = new Date(s.starts_at).getTime();
      const ends = new Date(s.ends_at).getTime();
      return starts <= now && now < ends;
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  if (inWindowOpen[0]) return inWindowOpen[0];

  const openAny = [...sessions]
    .filter((s) => s.status === "open")
    .sort(
      (a, b) =>
        new Date(b.started_at ?? b.starts_at).getTime() -
        new Date(a.started_at ?? a.starts_at).getTime()
    );
  if (openAny[0]) return openAny[0];

  return (
    [...sessions].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )[0] ?? null
  );
}

export async function updateSessionMatchingStyle(
  client: Client,
  sessionId: string,
  style: MatchingStyle,
  styleConfig: Record<string, unknown> = {}
) {
  const { data, error } = await (client as SupabaseClient).rpc(
    "set_open_play_matching_style",
    {
      p_session_id: sessionId,
      p_style: style,
      p_style_config: styleConfig,
    }
  );
  if (error) throw error;
  return data as OpenPlaySessionRow;
}

export async function listQueue(client: Client, sessionId: string) {
  const { data, error } = await (client as SupabaseClient)
    .from("open_play_queue")
    .select(
      "*, profile:profiles(id, full_name, elo_rating, skill_level, gender, avatar_url), walk_in:players(id, full_name)"
    )
    .eq("session_id", sessionId)
    .in("status", ["waiting", "playing", "called"])
    .order("priority", { ascending: false })
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as LiveQueueRow[];
}

export async function listQueueByLane(
  client: Client,
  sessionId: string,
  lane: QueueLane | string
) {
  const rows = await listQueue(client, sessionId);
  return rows.filter((r) => r.lane === lane && r.status === "waiting");
}

export async function registerWalkInOpenPlay(
  client: Client,
  input: {
    sessionId: string;
    fullName: string;
    gender: "male" | "female";
    skillLevel: SkillLevel;
  }
) {
  const { data, error } = await client.rpc("register_walk_in_open_play", {
    p_session_id: input.sessionId,
    p_full_name: input.fullName,
    p_gender: input.gender,
    p_skill_level: input.skillLevel,
  });
  if (error) throw error;
  return data;
}

export function queuePlayerName(entry: QueueEntry) {
  return entry.member?.full_name ?? "Player";
}

export function mapLiveQueueToEntry(row: LiveQueueRow, index: number): QueueEntry {
  const displayName =
    row.profile?.full_name ?? row.walk_in?.full_name ?? "Player";
  const personId = row.profile_id ?? row.walk_in_id ?? row.id;

  return {
    id: row.id,
    branch_id: "",
    member_id: row.profile_id,
    walk_in_id: row.walk_in_id,
    position: row.position ?? index + 1,
    status: (row.status === "left"
      ? "cancelled"
      : row.status === "done"
        ? "completed"
        : row.status) as QueueEntry["status"],
    priority: row.priority ?? 0,
    party_size: 1,
    joined_at: row.joined_at,
    called_at: null,
    paused: Boolean(row.paused),
    lane: row.lane,
    skill_level: row.skill_level,
    gender: row.gender ?? row.profile?.gender ?? null,
    member: {
      id: personId,
      branch_id: "",
      member_code: row.walk_in_id ? "PLAYER" : "",
      full_name: displayName,
      email: null,
      phone: null,
      avatar_url: row.profile?.avatar_url ?? null,
      date_of_birth: null,
      gender: row.gender ?? row.profile?.gender ?? null,
      status: "active",
      rfid_tag: null,
      elo_rating: row.profile?.elo_rating ?? 1000,
      wallet_balance: 0,
      notes: null,
      joined_at: row.joined_at,
      created_at: row.joined_at,
      updated_at: row.joined_at,
    },
  };
}

export async function skipQueuePlayer(client: Client, entryId: string) {
  const { error } = await (client as SupabaseClient)
    .from("open_play_queue")
    .update({ status: "left" })
    .eq("id", entryId);
  if (error) throw error;
}

export async function removeQueuePlayer(client: Client, entryId: string) {
  const { error } = await (client as SupabaseClient)
    .from("open_play_queue")
    .update({ status: "left" })
    .eq("id", entryId);
  if (error) throw error;
}

export async function bumpPriority(
  client: Client,
  entryId: string,
  priority: number
) {
  const { error } = await (client as SupabaseClient)
    .from("open_play_queue")
    .update({ priority })
    .eq("id", entryId);
  if (error) throw error;
}

/** Temporarily remove a player from matchmaking without changing queue position. */
export async function setQueueEntryPaused(
  client: Client,
  entryId: string,
  paused: boolean
) {
  const { error } = await (client as SupabaseClient)
    .from("open_play_queue")
    .update({ paused })
    .eq("id", entryId);
  if (error) throw error;
}

export async function setQueuePaused(
  client: Client,
  branchId: string,
  paused: boolean
) {
  const { error } = await (client as SupabaseClient)
    .from("branch_settings")
    .update({ queue_paused: paused, updated_at: new Date().toISOString() })
    .eq("branch_id", branchId);
  if (error) throw error;
}

export async function generateMatch(
  client: Client,
  sessionId: string,
  courtId: string | null
) {
  const { data, error } = await client.rpc("generate_open_play_match", {
    p_session_id: sessionId,
    p_court_id: courtId as string,
  });
  if (error) throw error;
  return data as string;
}

export async function createManualMatch(
  client: Client,
  sessionId: string,
  courtId: string | null,
  teamA: [string, string],
  teamB: [string, string]
) {
  const { data, error } = await client.rpc("create_manual_open_play_match", {
    p_session_id: sessionId,
    p_court_id: courtId as string,
    p_team_a: teamA,
    p_team_b: teamB,
  });
  if (error) throw error;
  return data as string;
}

export async function listActiveMatches(client: Client, sessionId: string) {
  return listOpenPlayMatches(client, {
    sessionId,
    statuses: ["assigned", "active"],
  });
}

export async function listOpenPlayMatches(
  client: Client,
  opts: {
    branchId?: string;
    sessionId?: string;
    statuses?: Array<"assigned" | "active" | "completed">;
    limit?: number;
  } = {}
) {
  const statuses = opts.statuses ?? ["assigned", "active", "completed"];
  const limit = opts.limit ?? 40;

  let query = client
    .from("open_play_matches")
    .select(
      `
      *,
      court:courts(*),
      session:open_play_sessions!inner(id, branch_id, status),
      players:open_play_match_players(
        team,
        profile_id,
        walk_in_id,
        profile:profiles!open_play_match_players_profile_id_fkey(id, full_name),
        walk_in:players!open_play_match_players_walk_in_id_fkey(id, full_name)
      )
    `
    )
    .in("status", statuses)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (opts.sessionId) {
    query = query.eq("session_id", opts.sessionId);
  }
  if (opts.branchId) {
    query = query.eq("session.branch_id", opts.branchId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => mapOpenPlayMatchRow(row));
}

type MatchPlayerJoin = {
  team: "a" | "b";
  profile_id: string | null;
  walk_in_id: string | null;
  profile?: { id: string; full_name: string | null } | null;
  walk_in?: { id: string; full_name: string } | null;
};

function mapOpenPlayMatchRow(row: Record<string, unknown>): Match {
  const players = (row.players as MatchPlayerJoin[] | null) ?? [];
  const teamA = players.filter((p) => p.team === "a");
  const teamB = players.filter((p) => p.team === "b");
  const courtRow = row.court as CourtRow | null | undefined;
  const session = row.session as { id: string; branch_id: string } | null;

  const dbStatus = row.status as "assigned" | "active" | "completed";
  const status: Match["status"] =
    dbStatus === "active"
      ? "in_progress"
      : dbStatus === "assigned"
        ? "scheduled"
        : "completed";

  const playerId = (p: MatchPlayerJoin) =>
    p.profile_id ?? p.walk_in_id ?? "";
  const playerName = (p: MatchPlayerJoin) =>
    p.profile?.full_name ?? p.walk_in?.full_name ?? "Player";

  return {
    id: row.id as string,
    branch_id: session?.branch_id ?? "",
    court_id: (row.court_id as string) ?? null,
    tournament_id: null,
    session_id: row.session_id as string,
    status,
    team_a: teamA.map(playerId).filter(Boolean),
    team_b: teamB.map(playerId).filter(Boolean),
    team_a_names: teamA.map(playerName),
    team_b_names: teamB.map(playerName),
    score_a: (row.score_a as number) ?? 0,
    score_b: (row.score_b as number) ?? 0,
    winner_team: (row.winner_team as "a" | "b" | null) ?? null,
    started_at: (row.started_at as string) ?? null,
    ended_at: (row.ended_at as string | null) ?? null,
    duration_minutes: (row.duration_minutes as number | null) ?? null,
    created_at: (row.started_at as string) ?? new Date().toISOString(),
    court: courtRow ? mapCourtRow(courtRow) : undefined,
    source: "open_play",
  };
}

export async function startOpenPlayMatch(client: Client, matchId: string) {
  const { error } = await client
    .from("open_play_matches")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .eq("status", "assigned");
  if (error) throw error;
}

export async function updateOpenPlayMatchScore(
  client: Client,
  matchId: string,
  scoreA: number,
  scoreB: number
) {
  const { error } = await client
    .from("open_play_matches")
    .update({
      score_a: Math.max(0, scoreA),
      score_b: Math.max(0, scoreB),
    })
    .eq("id", matchId)
    .in("status", ["assigned", "active"]);
  if (error) throw error;
}

export async function completeMatch(client: Client, matchId: string) {
  const { data, error } = await client.rpc("complete_open_play_match", {
    p_match_id: matchId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function completeMatchWithResult(
  client: Client,
  matchId: string,
  scoreA: number,
  scoreB: number,
  winnerTeam: "a" | "b"
) {
  const { data, error } = await client.rpc("complete_open_play_match", {
    p_match_id: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
    p_winner_team: winnerTeam,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateCourtSkillLevel(
  client: Client,
  courtId: string,
  skillLevel: SkillLevel | null
) {
  const { error } = await (client as SupabaseClient)
    .from("courts")
    .update({ skill_level: skillLevel })
    .eq("id", courtId);
  if (error) throw error;
}
