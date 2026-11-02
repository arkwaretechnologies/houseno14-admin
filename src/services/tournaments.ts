import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { SkillLevel, TournamentFormat } from "@/lib/constants";
import { rpcByName } from "@/lib/supabase/rpc-by-name";

type Client = SupabaseClient<Database>;

export type TournamentStatus =
  | "draft"
  | "registration"
  | "seeding"
  | "ongoing"
  | "completed"
  | "cancelled";

export type TournamentBracketType =
  | "winners"
  | "losers"
  | "consolation"
  | "pool"
  | "swiss"
  | "knockout";

export type TournamentMatchStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "bye";

export type TournamentRegistrationStatus =
  | "registered"
  | "checked_in"
  | "withdrawn";

export type TournamentRow = {
  id: string;
  branch_id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_players: number;
  entry_fee_cents: number;
  description: string | null;
  advance_count: number | null;
  consolation_enabled: boolean;
  swiss_rounds: number;
  created_at: string;
  updated_at?: string;
};

export type TournamentDivisionRow = {
  id: string;
  tournament_id: string;
  skill_level: SkillLevel;
  name: string;
  max_players: number | null;
  status: TournamentStatus;
  entry_fee_cents: number;
  created_at: string;
  updated_at?: string;
};

export type TournamentRegistrationRow = {
  id: string;
  tournament_id: string;
  division_id: string | null;
  profile_id: string | null;
  walk_in_id: string | null;
  seed: number | null;
  status: TournamentRegistrationStatus;
  checked_in_at: string | null;
  created_at: string;
  profile?: { id: string; full_name: string | null } | null;
  walk_in?: { id: string; full_name: string } | null;
  division?: TournamentDivisionRow | null;
};

export type TournamentMatchRow = {
  id: string;
  tournament_id: string;
  division_id: string;
  bracket_type: TournamentBracketType;
  round: number;
  position: number;
  player_a_reg_id: string | null;
  player_b_reg_id: string | null;
  score_a: number | null;
  score_b: number | null;
  winner_reg_id: string | null;
  status: TournamentMatchStatus;
  next_match_id: string | null;
  next_slot: "a" | "b" | null;
  loser_next_match_id: string | null;
  loser_next_slot: "a" | "b" | null;
  court_id: string | null;
  created_at: string;
  updated_at?: string;
};

export type TournamentStandingRow = {
  registration_id: string;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  point_diff: number;
  seed: number | null;
  rank: number;
};

export type CreateTournamentInput = {
  branchId: string;
  name: string;
  format: TournamentFormat;
  startsAt?: string | null;
  endsAt?: string | null;
  maxPlayers?: number;
  /** Fallback / tournament-level minimum fee */
  entryFeeCents?: number;
  /** Per skill-level fees in centavos */
  skillEntryFees?: Partial<Record<SkillLevel, number>>;
  description?: string | null;
  advanceCount?: number | null;
  consolationEnabled?: boolean;
  swissRounds?: number;
  skillLevels: SkillLevel[];
};

const REG_SELECT =
  "*, profile:profiles!tournament_registrations_profile_id_fk(id, full_name), walk_in:players!tournament_registrations_walk_in_id_fk(id, full_name), division:tournament_divisions(*)";

export function registrationDisplayName(reg: TournamentRegistrationRow) {
  return reg.profile?.full_name ?? reg.walk_in?.full_name ?? "Player";
}

export async function listTournaments(client: Client, branchId: string) {
  const { data, error } = await client
    .from("tournaments")
    .select("*")
    .eq("branch_id", branchId)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TournamentRow[];
}

export async function getTournament(client: Client, tournamentId: string) {
  const { data, error } = await client
    .from("tournaments")
    .select("*")
    .eq("id", tournamentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as TournamentRow | null;
}

export async function listTournamentDivisions(
  client: Client,
  tournamentId: string
) {
  const { data, error } = await client
    .from("tournament_divisions")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("skill_level");
  if (error) throw new Error(error.message);
  return (data ?? []) as TournamentDivisionRow[];
}

export async function listTournamentRegistrations(
  client: Client,
  tournamentId: string
) {
  const { data, error } = await client
    .from("tournament_registrations")
    .select(REG_SELECT)
    .eq("tournament_id", tournamentId)
    .neq("status", "withdrawn")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TournamentRegistrationRow[];
}

export async function listTournamentMatches(
  client: Client,
  tournamentId: string,
  divisionId?: string
) {
  let query = client
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("bracket_type")
    .order("round")
    .order("position");
  if (divisionId) query = query.eq("division_id", divisionId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as TournamentMatchRow[];
}

export async function createTournament(
  client: Client,
  input: CreateTournamentInput
) {
  const { data, error } = await client.rpc("create_tournament", {
    p_branch_id: input.branchId,
    p_name: input.name,
    p_format: input.format,
    p_starts_at: input.startsAt ?? undefined,
    p_ends_at: input.endsAt ?? undefined,
    p_max_players: input.maxPlayers ?? 16,
    p_entry_fee_cents: input.entryFeeCents ?? 0,
    p_description: input.description ?? undefined,
    p_advance_count: input.advanceCount ?? undefined,
    p_consolation_enabled: input.consolationEnabled ?? false,
    p_swiss_rounds: input.swissRounds ?? 5,
    p_skill_levels: input.skillLevels,
    p_skill_entry_fees: (input.skillEntryFees ?? {}) as Json,
  });
  if (error) throw new Error(error.message);
  return data as TournamentRow;
}

export async function updateTournamentStatus(
  client: Client,
  tournamentId: string,
  status: TournamentStatus
) {
  const { data, error } = await client.rpc("update_tournament", {
    p_tournament_id: tournamentId,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return data as TournamentRow;
}

export async function registerTournamentPlayer(
  client: Client,
  input: {
    tournamentId: string;
    divisionId: string;
    profileId?: string | null;
    walkInId?: string | null;
    seed?: number | null;
  }
) {
  const { data, error } = await client.rpc("register_tournament_player", {
    p_tournament_id: input.tournamentId,
    p_division_id: input.divisionId,
    p_profile_id: input.profileId ?? undefined,
    p_walk_in_id: input.walkInId ?? undefined,
    p_seed: input.seed ?? undefined,
  });
  if (error) throw new Error(error.message);
  return data as TournamentRegistrationRow;
}

export async function checkInTournamentRegistration(
  client: Client,
  registrationId: string,
  checkedIn = true
) {
  const { data, error } = await client.rpc("check_in_tournament_registration", {
    p_registration_id: registrationId,
    p_checked_in: checkedIn,
  });
  if (error) throw new Error(error.message);
  return data as TournamentRegistrationRow;
}

export async function setTournamentRegistrationSeed(
  client: Client,
  registrationId: string,
  seed: number
) {
  const { data, error } = await client.rpc("set_tournament_registration_seed", {
    p_registration_id: registrationId,
    p_seed: seed,
  });
  if (error) throw new Error(error.message);
  return data as TournamentRegistrationRow;
}

export async function generateTournamentBrackets(
  client: Client,
  tournamentId: string
) {
  const { data, error } = await rpcByName(client, "generate_tournament_brackets", {
    p_tournament_id: tournamentId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function recordTournamentMatchScore(
  client: Client,
  matchId: string,
  scoreA: number,
  scoreB: number
) {
  const { data, error } = await rpcByName(client, "record_tournament_match_score", {
    p_match_id: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
  });
  if (error) throw new Error(error.message);
  return data as TournamentMatchRow;
}

export async function startKnockoutFromStandings(
  client: Client,
  divisionId: string
) {
  const { data, error } = await rpcByName(client, "start_knockout_from_standings", {
    p_division_id: divisionId,
  });
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function getTournamentDivisionStandings(
  client: Client,
  divisionId: string
) {
  const { data, error } = await rpcByName(client, "get_tournament_division_standings", {
    p_division_id: divisionId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TournamentStandingRow[];
}
