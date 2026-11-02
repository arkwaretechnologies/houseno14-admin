import type { MatchingStyle } from "@/lib/constants";
import type { QueueEntry } from "@/types";

export type PreviewMatch = {
  id: string;
  queue_ids: string[];
  team_a: QueueEntry[];
  team_b: QueueEntry[];
  team_a_names: string[];
  team_b_names: string[];
};

export type PreviewBoard = {
  next_matches: PreviewMatch[];
  waiting: QueueEntry[];
};

function playerName(entry: QueueEntry) {
  return entry.member?.full_name ?? "Player";
}

function playerElo(entry: QueueEntry) {
  return entry.member?.elo_rating ?? 1000;
}

function sortByEloAsc(entries: QueueEntry[]) {
  return [...entries].sort(
    (a, b) =>
      playerElo(a) - playerElo(b) ||
      a.joined_at.localeCompare(b.joined_at) ||
      a.id.localeCompare(b.id)
  );
}

/** ELO-balanced teams: lowest+highest vs middle two (matches create_balanced_match). */
export function pairBalancedTeams(entries: QueueEntry[]): {
  team_a: QueueEntry[];
  team_b: QueueEntry[];
} | null {
  if (entries.length !== 4) return null;
  const sorted = sortByEloAsc(entries);
  return {
    team_a: [sorted[0], sorted[3]],
    team_b: [sorted[1], sorted[2]],
  };
}

/** Mixed doubles: low-M + high-F vs high-M + low-F (matches create_mixed_doubles_match). */
export function pairMixedDoublesTeams(
  males: QueueEntry[],
  females: QueueEntry[]
): { team_a: QueueEntry[]; team_b: QueueEntry[] } | null {
  if (males.length !== 2 || females.length !== 2) return null;
  const m = sortByEloAsc(males);
  const f = sortByEloAsc(females);
  return {
    team_a: [m[0], f[1]],
    team_b: [m[1], f[0]],
  };
}

function takeNextGroup(
  waiting: QueueEntry[],
  style: MatchingStyle
): QueueEntry[] | null {
  if (style === "mixed_doubles") {
    const males = waiting.filter((q) => q.gender === "male").slice(0, 2);
    const females = waiting.filter((q) => q.gender === "female").slice(0, 2);
    if (males.length < 2 || females.length < 2) return null;
    return [males[0], females[0], males[1], females[1]];
  }
  if (waiting.length < 4) return null;
  return waiting.slice(0, 4);
}

function toPreviewMatch(
  id: string,
  team_a: QueueEntry[],
  team_b: QueueEntry[]
): PreviewMatch {
  return {
    id,
    queue_ids: [...team_a, ...team_b].map((q) => q.id),
    team_a,
    team_b,
    team_a_names: team_a.map(playerName),
    team_b_names: team_b.map(playerName),
  };
}

/**
 * Build up to `limit` next-match previews from an ordered waiting list.
 * Waiting order must already be priority desc, joined_at asc.
 */
export function buildOpenPlayPreviewBoard(
  waitingOrdered: QueueEntry[],
  style: MatchingStyle,
  limit = 3
): PreviewBoard {
  let remaining = [...waitingOrdered];
  const next_matches: PreviewMatch[] = [];

  while (next_matches.length < limit) {
    const group = takeNextGroup(remaining, style);
    if (!group) break;

    const paired =
      style === "mixed_doubles"
        ? pairMixedDoublesTeams(
            group.filter((q) => q.gender === "male"),
            group.filter((q) => q.gender === "female")
          )
        : pairBalancedTeams(group);

    if (!paired) break;

    const picked = new Set(group.map((q) => q.id));
    next_matches.push(
      toPreviewMatch(`preview-${next_matches.length + 1}`, paired.team_a, paired.team_b)
    );
    remaining = remaining.filter((q) => !picked.has(q.id));
  }

  return { next_matches, waiting: remaining };
}

/** First preview match players in display order (team A then team B). */
export function firstPreviewPlayers(
  waitingOrdered: QueueEntry[],
  style: MatchingStyle
): QueueEntry[] {
  const board = buildOpenPlayPreviewBoard(waitingOrdered, style, 1);
  const match = board.next_matches[0];
  if (!match) {
    if (style === "mixed_doubles") {
      const males = waitingOrdered.filter((q) => q.gender === "male").slice(0, 2);
      const females = waitingOrdered
        .filter((q) => q.gender === "female")
        .slice(0, 2);
      return [...males, ...females];
    }
    return waitingOrdered.slice(0, 4);
  }
  return [...match.team_a, ...match.team_b];
}
