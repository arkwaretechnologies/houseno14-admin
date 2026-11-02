import { DEMO_MEMBERS, DEMO_TOURNAMENTS } from "@/lib/demo-data";
import { getDemoPlayers } from "@/lib/demo-players";
import { SKILL_LEVEL_LABELS, type SkillLevel } from "@/lib/constants";
import type {
  CreateTournamentInput,
  TournamentBracketType,
  TournamentDivisionRow,
  TournamentMatchRow,
  TournamentRegistrationRow,
  TournamentRow,
  TournamentStandingRow,
  TournamentStatus,
} from "@/services/tournaments";

type DemoState = {
  tournaments: TournamentRow[];
  divisions: TournamentDivisionRow[];
  registrations: TournamentRegistrationRow[];
  matches: TournamentMatchRow[];
};

const nowIso = () => new Date().toISOString();

function asRow(t: (typeof DEMO_TOURNAMENTS)[number]): TournamentRow {
  return {
    id: t.id,
    branch_id: t.branch_id,
    name: t.name,
    format: t.format,
    status: t.status,
    starts_at: t.starts_at,
    ends_at: t.ends_at,
    max_players: t.max_players,
    entry_fee_cents: t.entry_fee_cents,
    description: t.description,
    advance_count: t.advance_count,
    consolation_enabled: t.consolation_enabled,
    swiss_rounds: t.swiss_rounds,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

function makeDivision(
  tournamentId: string,
  skill: SkillLevel,
  id: string,
  status: TournamentStatus = "registration",
  entryFeeCents = 0
): TournamentDivisionRow {
  return {
    id,
    tournament_id: tournamentId,
    skill_level: skill,
    name: SKILL_LEVEL_LABELS[skill],
    max_players: null,
    status,
    entry_fee_cents: entryFeeCents,
    created_at: nowIso(),
  };
}

function makeReg(input: {
  id: string;
  tournamentId: string;
  division: TournamentDivisionRow;
  profileId?: string | null;
  walkInId?: string | null;
  seed?: number | null;
  status?: TournamentRegistrationRow["status"];
  checkedInAt?: string | null;
}): TournamentRegistrationRow {
  const member = input.profileId
    ? DEMO_MEMBERS.find((m) => m.id === input.profileId)
    : undefined;
  const walkIn = input.walkInId
    ? getDemoPlayers().find((p) => p.id === input.walkInId)
    : undefined;
  return {
    id: input.id,
    tournament_id: input.tournamentId,
    division_id: input.division.id,
    profile_id: input.profileId ?? null,
    walk_in_id: input.walkInId ?? null,
    seed: input.seed ?? null,
    status: input.status ?? "registered",
    checked_in_at: input.checkedInAt ?? null,
    created_at: nowIso(),
    profile: member
      ? { id: member.id, full_name: member.full_name }
      : null,
    walk_in: walkIn
      ? { id: walkIn.id, full_name: walkIn.full_name }
      : null,
    division: input.division,
  };
}

function makeMatch(input: {
  id: string;
  tournamentId: string;
  divisionId: string;
  bracketType: TournamentBracketType;
  round: number;
  position: number;
  playerA?: string | null;
  playerB?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  status?: TournamentMatchRow["status"];
  nextMatchId?: string | null;
  nextSlot?: "a" | "b" | null;
  loserNextMatchId?: string | null;
  loserNextSlot?: "a" | "b" | null;
}): TournamentMatchRow {
  const scoreA = input.scoreA ?? null;
  const scoreB = input.scoreB ?? null;
  const status = input.status ?? "scheduled";
  let winner: string | null = null;
  if (status === "bye") {
    winner = input.playerA ?? input.playerB ?? null;
  } else if (status === "completed" && scoreA != null && scoreB != null) {
    winner =
      scoreA > scoreB ? input.playerA ?? null : input.playerB ?? null;
  }
  return {
    id: input.id,
    tournament_id: input.tournamentId,
    division_id: input.divisionId,
    bracket_type: input.bracketType,
    round: input.round,
    position: input.position,
    player_a_reg_id: input.playerA ?? null,
    player_b_reg_id: input.playerB ?? null,
    score_a: scoreA ?? (status === "bye" && input.playerA ? 1 : status === "bye" ? 0 : null),
    score_b: scoreB ?? (status === "bye" && input.playerB ? 1 : status === "bye" ? 0 : null),
    winner_reg_id: winner,
    status,
    next_match_id: input.nextMatchId ?? null,
    next_slot: input.nextSlot ?? null,
    loser_next_match_id: input.loserNextMatchId ?? null,
    loser_next_slot: input.loserNextSlot ?? null,
    court_id: null,
    created_at: nowIso(),
  };
}

function placePlayer(
  matchId: string,
  slot: "a" | "b",
  regId: string
) {
  const m = state.matches.find((row) => row.id === matchId);
  if (!m || m.status === "completed" || m.status === "bye") return;
  if (slot === "a") m.player_a_reg_id = regId;
  else m.player_b_reg_id = regId;
  m.updated_at = nowIso();
}

function advanceFromMatch(match: TournamentMatchRow) {
  if (!match.winner_reg_id) return;
  if (match.next_match_id && match.next_slot) {
    placePlayer(match.next_match_id, match.next_slot, match.winner_reg_id);
  }
  const loser =
    match.winner_reg_id === match.player_a_reg_id
      ? match.player_b_reg_id
      : match.player_a_reg_id;
  if (loser && match.loser_next_match_id && match.loser_next_slot) {
    placePlayer(match.loser_next_match_id, match.loser_next_slot, loser);
  }
}

function buildKnockoutTree(input: {
  tournamentId: string;
  divisionId: string;
  regIds: string[];
  bracketType: TournamentBracketType;
  consolation: boolean;
  idFactory: () => string;
}): number {
  const n = input.regIds.length;
  if (n < 2) return 0;
  const size = nextPowerOfTwo(n);
  const rounds = Math.max(1, Math.round(Math.log2(size)));
  const order = seedOrder(size);
  const slots = order.map((seedNum) => input.regIds[seedNum - 1] ?? null);

  const roundIds: string[][] = [];
  let created = 0;

  for (let round = 1; round <= rounds; round++) {
    const count = size / 2 ** round;
    const ids: string[] = [];
    for (let pos = 1; pos <= count; pos++) {
      const id = input.idFactory();
      ids.push(id);
      state.matches.push(
        makeMatch({
          id,
          tournamentId: input.tournamentId,
          divisionId: input.divisionId,
          bracketType: input.bracketType,
          round,
          position: pos,
        })
      );
      created += 1;
    }
    roundIds.push(ids);
  }

  for (let round = 0; round < rounds - 1; round++) {
    const cur = roundIds[round];
    const next = roundIds[round + 1];
    for (let i = 0; i < cur.length; i++) {
      const m = state.matches.find((row) => row.id === cur[i]);
      if (!m) continue;
      m.next_match_id = next[Math.floor(i / 2)];
      m.next_slot = i % 2 === 0 ? "a" : "b";
    }
  }

  const r1 = roundIds[0];
  for (let i = 0; i < r1.length; i++) {
    const m = state.matches.find((row) => row.id === r1[i]);
    if (!m) continue;
    const a = slots[i * 2];
    const b = slots[i * 2 + 1];
    m.player_a_reg_id = a;
    m.player_b_reg_id = b;
    if (a && !b) {
      m.status = "bye";
      m.winner_reg_id = a;
      m.score_a = 1;
      m.score_b = 0;
      advanceFromMatch(m);
    } else if (b && !a) {
      m.status = "bye";
      m.winner_reg_id = b;
      m.score_a = 0;
      m.score_b = 1;
      advanceFromMatch(m);
    }
  }

  if (input.consolation && rounds >= 2) {
    const semis = roundIds[rounds - 2];
    if (semis?.length >= 2) {
      const consolationId = input.idFactory();
      state.matches.push(
        makeMatch({
          id: consolationId,
          tournamentId: input.tournamentId,
          divisionId: input.divisionId,
          bracketType: "consolation",
          round: 1,
          position: 1,
        })
      );
      created += 1;
      const s0 = state.matches.find((row) => row.id === semis[0]);
      const s1 = state.matches.find((row) => row.id === semis[1]);
      if (s0) {
        s0.loser_next_match_id = consolationId;
        s0.loser_next_slot = "a";
      }
      if (s1) {
        s1.loser_next_match_id = consolationId;
        s1.loser_next_slot = "b";
      }
    }
  }

  return created;
}

function generateSwissRoundDemo(input: {
  tournamentId: string;
  divisionId: string;
  round: number;
  idFactory: () => string;
}): number {
  const standings = demoGetDivisionStandings(input.divisionId);
  const ordered =
    standings.length > 0
      ? standings.map((s) => s.registration_id)
      : sortedRegs(
          state.registrations.filter(
            (r) =>
              r.division_id === input.divisionId && r.status === "checked_in"
          )
        ).map((r) => r.id);

  if (ordered.length < 2) return 0;

  const used = new Set<string>();
  let pos = 1;
  let created = 0;

  for (let i = 0; i < ordered.length; i++) {
    const a = ordered[i];
    if (used.has(a)) continue;

    let b: string | null = null;
    for (let j = i + 1; j < ordered.length; j++) {
      const cand = ordered[j];
      if (used.has(cand)) continue;
      const played = state.matches.some(
        (m) =>
          m.division_id === input.divisionId &&
          m.bracket_type === "swiss" &&
          ((m.player_a_reg_id === a && m.player_b_reg_id === cand) ||
            (m.player_a_reg_id === cand && m.player_b_reg_id === a))
      );
      if (!played) {
        b = cand;
        break;
      }
    }
    if (!b) {
      for (let j = i + 1; j < ordered.length; j++) {
        if (!used.has(ordered[j])) {
          b = ordered[j];
          break;
        }
      }
    }

    used.add(a);
    if (!b) {
      const bye = makeMatch({
        id: input.idFactory(),
        tournamentId: input.tournamentId,
        divisionId: input.divisionId,
        bracketType: "swiss",
        round: input.round,
        position: pos,
        playerA: a,
        status: "bye",
        scoreA: 1,
        scoreB: 0,
      });
      state.matches.push(bye);
    } else {
      used.add(b);
      state.matches.push(
        makeMatch({
          id: input.idFactory(),
          tournamentId: input.tournamentId,
          divisionId: input.divisionId,
          bracketType: "swiss",
          round: input.round,
          position: pos,
          playerA: a,
          playerB: b,
        })
      );
    }
    created += 1;
    pos += 1;
  }

  return created;
}

const t1Beginner = makeDivision("t1", "beginner", "td-t1-beginner");
const t1Intermediate = makeDivision("t1", "intermediate", "td-t1-intermediate");
const t2Intermediate = makeDivision(
  "t2",
  "intermediate",
  "td-t2-intermediate",
  "ongoing"
);

const seedRegs: TournamentRegistrationRow[] = [
  makeReg({
    id: "tr-t1-1",
    tournamentId: "t1",
    division: t1Beginner,
    profileId: "m1",
    seed: 1,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
  makeReg({
    id: "tr-t1-2",
    tournamentId: "t1",
    division: t1Beginner,
    profileId: "m2",
    seed: 2,
  }),
  makeReg({
    id: "tr-t1-3",
    tournamentId: "t1",
    division: t1Beginner,
    walkInId: "player-demo-2",
    seed: 3,
  }),
  makeReg({
    id: "tr-t1-4",
    tournamentId: "t1",
    division: t1Intermediate,
    profileId: "m4",
    seed: 1,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
  makeReg({
    id: "tr-t1-5",
    tournamentId: "t1",
    division: t1Intermediate,
    profileId: "m5",
    seed: 2,
  }),
  makeReg({
    id: "tr-t1-6",
    tournamentId: "t1",
    division: t1Intermediate,
    walkInId: "player-demo-1",
    seed: 3,
  }),
  makeReg({
    id: "tr-t2-1",
    tournamentId: "t2",
    division: t2Intermediate,
    profileId: "m1",
    seed: 1,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
  makeReg({
    id: "tr-t2-2",
    tournamentId: "t2",
    division: t2Intermediate,
    profileId: "m2",
    seed: 2,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
  makeReg({
    id: "tr-t2-3",
    tournamentId: "t2",
    division: t2Intermediate,
    profileId: "m3",
    seed: 3,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
  makeReg({
    id: "tr-t2-4",
    tournamentId: "t2",
    division: t2Intermediate,
    profileId: "m4",
    seed: 4,
    status: "checked_in",
    checkedInAt: nowIso(),
  }),
];

const seedMatches: TournamentMatchRow[] = [
  makeMatch({
    id: "tm-t2-1",
    tournamentId: "t2",
    divisionId: t2Intermediate.id,
    bracketType: "pool",
    round: 1,
    position: 1,
    playerA: "tr-t2-1",
    playerB: "tr-t2-4",
    scoreA: 11,
    scoreB: 7,
    status: "completed",
  }),
  makeMatch({
    id: "tm-t2-2",
    tournamentId: "t2",
    divisionId: t2Intermediate.id,
    bracketType: "pool",
    round: 1,
    position: 2,
    playerA: "tr-t2-2",
    playerB: "tr-t2-3",
    scoreA: 11,
    scoreB: 9,
    status: "completed",
  }),
  makeMatch({
    id: "tm-t2-3",
    tournamentId: "t2",
    divisionId: t2Intermediate.id,
    bracketType: "pool",
    round: 2,
    position: 1,
    playerA: "tr-t2-1",
    playerB: "tr-t2-3",
    status: "scheduled",
  }),
  makeMatch({
    id: "tm-t2-4",
    tournamentId: "t2",
    divisionId: t2Intermediate.id,
    bracketType: "pool",
    round: 2,
    position: 2,
    playerA: "tr-t2-2",
    playerB: "tr-t2-4",
    status: "scheduled",
  }),
];

const state: DemoState = {
  tournaments: DEMO_TOURNAMENTS.map(asRow),
  divisions: [t1Beginner, t1Intermediate, t2Intermediate],
  registrations: seedRegs,
  matches: seedMatches,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeDemoTournaments(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoTournaments(branchId?: string): TournamentRow[] {
  const list = branchId
    ? state.tournaments.filter((t) => t.branch_id === branchId)
    : state.tournaments;
  return list.map((t) => ({ ...t }));
}

export function getDemoTournament(id: string): TournamentRow | null {
  const row = state.tournaments.find((t) => t.id === id);
  return row ? { ...row } : null;
}

export function getDemoDivisions(tournamentId: string): TournamentDivisionRow[] {
  return state.divisions
    .filter((d) => d.tournament_id === tournamentId)
    .map((d) => ({ ...d }));
}

export function getDemoRegistrations(
  tournamentId: string
): TournamentRegistrationRow[] {
  return state.registrations
    .filter((r) => r.tournament_id === tournamentId && r.status !== "withdrawn")
    .map((r) => ({
      ...r,
      profile: r.profile ? { ...r.profile } : null,
      walk_in: r.walk_in ? { ...r.walk_in } : null,
      division: r.division ? { ...r.division } : null,
    }));
}

export function getDemoMatches(
  tournamentId: string,
  divisionId?: string
): TournamentMatchRow[] {
  return state.matches
    .filter(
      (m) =>
        m.tournament_id === tournamentId &&
        (!divisionId || m.division_id === divisionId)
    )
    .map((m) => ({ ...m }));
}

export function demoCreateTournament(input: CreateTournamentInput): TournamentRow {
  const id = `t-${Date.now()}`;
  const created: TournamentRow = {
    id,
    branch_id: input.branchId,
    name: input.name,
    format: input.format,
    status: "registration",
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    max_players: input.maxPlayers ?? 16,
    entry_fee_cents:
      input.skillEntryFees && Object.keys(input.skillEntryFees).length
        ? Math.min(
            ...input.skillLevels.map(
              (s) => input.skillEntryFees?.[s] ?? input.entryFeeCents ?? 0
            )
          )
        : input.entryFeeCents ?? 0,
    description: input.description ?? null,
    advance_count: input.advanceCount ?? null,
    consolation_enabled: input.consolationEnabled ?? false,
    swiss_rounds: input.swissRounds ?? 5,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  state.tournaments = [created, ...state.tournaments];
  for (const skill of input.skillLevels) {
    const fee =
      input.skillEntryFees?.[skill] ?? input.entryFeeCents ?? 0;
    state.divisions.push(
      makeDivision(id, skill, `td-${id}-${skill}`, "registration", fee)
    );
  }
  notify();
  return { ...created };
}

export function demoUpdateTournamentStatus(
  tournamentId: string,
  status: TournamentStatus
): TournamentRow {
  const row = state.tournaments.find((t) => t.id === tournamentId);
  if (!row) throw new Error("Tournament not found");
  row.status = status;
  row.updated_at = nowIso();
  for (const d of state.divisions.filter((x) => x.tournament_id === tournamentId)) {
    d.status = status;
    d.updated_at = nowIso();
  }
  notify();
  return { ...row };
}

export function demoRegisterPlayer(input: {
  tournamentId: string;
  divisionId: string;
  profileId?: string | null;
  walkInId?: string | null;
  seed?: number | null;
}): TournamentRegistrationRow {
  const division = state.divisions.find((d) => d.id === input.divisionId);
  if (!division) throw new Error("Division not found");
  const tournament = state.tournaments.find((t) => t.id === input.tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const existing = state.registrations.filter(
    (r) => r.tournament_id === input.tournamentId && r.status !== "withdrawn"
  );
  if (
    existing.some(
      (r) =>
        (input.profileId && r.profile_id === input.profileId) ||
        (input.walkInId && r.walk_in_id === input.walkInId)
    )
  ) {
    throw new Error("Player is already registered");
  }
  if (existing.length >= tournament.max_players) {
    throw new Error("Tournament is full");
  }

  const row = makeReg({
    id: `tr-${Date.now()}`,
    tournamentId: input.tournamentId,
    division,
    profileId: input.profileId,
    walkInId: input.walkInId,
    seed: input.seed,
  });
  state.registrations.push(row);
  notify();
  return {
    ...row,
    profile: row.profile ? { ...row.profile } : null,
    walk_in: row.walk_in ? { ...row.walk_in } : null,
    division: row.division ? { ...row.division } : null,
  };
}

export function demoCheckInRegistration(
  registrationId: string,
  checkedIn = true
): TournamentRegistrationRow {
  const row = state.registrations.find((r) => r.id === registrationId);
  if (!row) throw new Error("Registration not found");
  row.status = checkedIn ? "checked_in" : "registered";
  row.checked_in_at = checkedIn ? nowIso() : null;
  notify();
  return { ...row };
}

export function demoSetRegistrationSeed(
  registrationId: string,
  seed: number
): TournamentRegistrationRow {
  const row = state.registrations.find((r) => r.id === registrationId);
  if (!row) throw new Error("Registration not found");
  row.seed = seed;
  notify();
  return { ...row };
}

function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(2, p);
}

function seedOrder(count: number): number[] {
  if (count <= 1) return [1];
  const half = seedOrder(count / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(count + 1 - s);
  }
  return result;
}

function sortedRegs(regs: TournamentRegistrationRow[]) {
  return [...regs].sort((a, b) => {
    if (a.seed == null && b.seed == null) return 0;
    if (a.seed == null) return 1;
    if (b.seed == null) return -1;
    return a.seed - b.seed;
  });
}

function roundRobinPairs(regs: TournamentRegistrationRow[]) {
  const list: (TournamentRegistrationRow | null)[] = [...regs];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...list];
  const pairs: {
    round: number;
    position: number;
    a: TournamentRegistrationRow;
    b: TournamentRegistrationRow;
  }[] = [];
  for (let r = 0; r < rounds; r++) {
    let pos = 1;
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a && b) {
        pairs.push({ round: r + 1, position: pos, a, b });
        pos += 1;
      }
    }
    const last = arr.pop();
    if (last !== undefined) arr.splice(1, 0, last);
  }
  return pairs;
}

export function demoGenerateBrackets(tournamentId: string): number {
  const tournament = state.tournaments.find((t) => t.id === tournamentId);
  if (!tournament) throw new Error("Tournament not found");
  if (state.matches.some((m) => m.tournament_id === tournamentId)) {
    throw new Error("Brackets already exist for this tournament");
  }

  const divisions = state.divisions.filter((d) => d.tournament_id === tournamentId);
  let created = 0;
  let seq = 0;
  const nextId = () => `tm-${tournamentId}-${Date.now()}-${seq++}`;

  for (const division of divisions) {
    const regs = sortedRegs(
      state.registrations.filter(
        (r) => r.division_id === division.id && r.status !== "withdrawn"
      )
    );
    if (regs.length < 2) continue;

    if (tournament.format === "round_robin") {
      for (const pair of roundRobinPairs(regs)) {
        state.matches.push(
          makeMatch({
            id: nextId(),
            tournamentId,
            divisionId: division.id,
            bracketType: "pool",
            round: pair.round,
            position: pair.position,
            playerA: pair.a.id,
            playerB: pair.b.id,
          })
        );
        created += 1;
      }
      continue;
    }

    if (tournament.format === "swiss") {
      created += generateSwissRoundDemo({
        tournamentId,
        divisionId: division.id,
        round: 1,
        idFactory: nextId,
      });
      continue;
    }

    const checkedIn = regs.filter((r) => r.status === "checked_in");
    const pool = checkedIn.length >= 2 ? checkedIn : regs;
    created += buildKnockoutTree({
      tournamentId,
      divisionId: division.id,
      regIds: pool.map((r) => r.id),
      bracketType: "winners",
      consolation:
        tournament.format === "single_elimination" &&
        Boolean(tournament.consolation_enabled),
      idFactory: nextId,
    });

    if (tournament.format === "double_elimination") {
      // Lightweight losers bracket slots (winners feed via score advance when wired)
      const r1 = state.matches.filter(
        (m) =>
          m.division_id === division.id &&
          m.bracket_type === "winners" &&
          m.round === 1
      );
      const loserCount = Math.max(1, Math.floor(r1.length / 2));
      const loserIds: string[] = [];
      for (let i = 0; i < loserCount; i++) {
        const id = nextId();
        loserIds.push(id);
        state.matches.push(
          makeMatch({
            id,
            tournamentId,
            divisionId: division.id,
            bracketType: "losers",
            round: 1,
            position: i + 1,
          })
        );
        created += 1;
      }
      r1.forEach((m, idx) => {
        const target = loserIds[Math.floor(idx / 2)];
        if (!target) return;
        m.loser_next_match_id = target;
        m.loser_next_slot = idx % 2 === 0 ? "a" : "b";
      });
    }
  }

  if (created === 0) {
    throw new Error("Need at least two players in a division to generate brackets");
  }
  if (tournament.status === "registration") {
    tournament.status = "seeding";
  }
  tournament.updated_at = nowIso();
  notify();
  return created;
}

export function demoRecordMatchScore(
  matchId: string,
  scoreA: number,
  scoreB: number
): TournamentMatchRow {
  const row = state.matches.find((m) => m.id === matchId);
  if (!row) throw new Error("Match not found");
  if (row.status === "bye" || row.status === "completed") {
    throw new Error("Match already completed");
  }
  if (!row.player_a_reg_id || !row.player_b_reg_id) {
    throw new Error("Match is missing a player");
  }
  if (scoreA === scoreB) throw new Error("Scores cannot be tied");
  row.score_a = scoreA;
  row.score_b = scoreB;
  row.winner_reg_id =
    scoreA > scoreB ? row.player_a_reg_id : row.player_b_reg_id;
  row.status = "completed";
  row.updated_at = nowIso();
  advanceFromMatch(row);

  if (row.bracket_type === "swiss") {
    const tournament = state.tournaments.find(
      (t) => t.id === row.tournament_id
    );
    const pending = state.matches.filter(
      (m) =>
        m.division_id === row.division_id &&
        m.bracket_type === "swiss" &&
        m.round === row.round &&
        m.status === "scheduled"
    ).length;
    if (pending === 0 && tournament) {
      const maxRound = Math.max(
        0,
        ...state.matches
          .filter(
            (m) =>
              m.division_id === row.division_id && m.bracket_type === "swiss"
          )
          .map((m) => m.round)
      );
      if (maxRound < (tournament.swiss_rounds || 5)) {
        let seq = 0;
        generateSwissRoundDemo({
          tournamentId: row.tournament_id,
          divisionId: row.division_id,
          round: maxRound + 1,
          idFactory: () =>
            `tm-swiss-${row.division_id}-${Date.now()}-${seq++}`,
        });
      }
    }
  }

  notify();
  return { ...row };
}

export function demoGetDivisionStandings(
  divisionId: string
): TournamentStandingRow[] {
  const regs = state.registrations.filter(
    (r) => r.division_id === divisionId && r.status !== "withdrawn"
  );
  const matches = state.matches.filter(
    (m) =>
      m.division_id === divisionId &&
      m.status === "completed" &&
      (m.bracket_type === "pool" || m.bracket_type === "swiss")
  );

  const table = new Map<string, TournamentStandingRow>();
  for (const r of regs) {
    table.set(r.id, {
      registration_id: r.id,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      point_diff: 0,
      seed: r.seed,
      rank: 0,
    });
  }

  for (const m of matches) {
    if (
      !m.player_a_reg_id ||
      !m.player_b_reg_id ||
      m.score_a == null ||
      m.score_b == null
    ) {
      continue;
    }
    const a = table.get(m.player_a_reg_id);
    const b = table.get(m.player_b_reg_id);
    if (!a || !b) continue;
    a.points_for += m.score_a;
    a.points_against += m.score_b;
    b.points_for += m.score_b;
    b.points_against += m.score_a;
    if (m.winner_reg_id === m.player_a_reg_id) {
      a.wins += 1;
      b.losses += 1;
    } else {
      b.wins += 1;
      a.losses += 1;
    }
  }

  const rows = [...table.values()].map((r) => ({
    ...r,
    point_diff: r.points_for - r.points_against,
  }));
  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.point_diff !== a.point_diff) return b.point_diff - a.point_diff;
    if (b.points_for !== a.points_for) return b.points_for - a.points_for;
    return (a.seed ?? 999) - (b.seed ?? 999);
  });
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

export function demoStartKnockoutFromStandings(divisionId: string): number {
  const division = state.divisions.find((d) => d.id === divisionId);
  if (!division) throw new Error("Division not found");
  const tournament = state.tournaments.find((t) => t.id === division.tournament_id);
  if (!tournament) throw new Error("Tournament not found");
  const advance = tournament.advance_count;
  if (!advance || advance < 2) {
    throw new Error("Set advance count before starting knockout");
  }
  if (
    state.matches.some(
      (m) => m.division_id === divisionId && m.bracket_type === "knockout"
    )
  ) {
    throw new Error("Knockout already started for this division");
  }

  const standings = demoGetDivisionStandings(divisionId).slice(0, advance);
  if (standings.length < 2) {
    throw new Error("Need at least two players in standings");
  }

  let seq = 0;
  const created = buildKnockoutTree({
    tournamentId: tournament.id,
    divisionId,
    regIds: standings.map((s) => s.registration_id),
    bracketType: "knockout",
    consolation: Boolean(tournament.consolation_enabled),
    idFactory: () => `tm-ko-${divisionId}-${Date.now()}-${seq++}`,
  });
  notify();
  return created;
}
