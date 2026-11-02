import {
  GitBranch,
  Network,
  Rows3,
  Shuffle,
  type LucideIcon,
} from "lucide-react";
import type { TournamentFormat } from "@/lib/constants";
import type { TournamentStatus, TournamentBracketType } from "@/services/tournaments";

export const FORMAT_META: Record<
  TournamentFormat,
  { label: string; icon: LucideIcon; description: string }
> = {
  single_elimination: {
    label: "Single Elimination",
    icon: GitBranch,
    description: "One loss and you're out",
  },
  double_elimination: {
    label: "Double Elimination",
    icon: Network,
    description: "Losers bracket gives a second chance",
  },
  round_robin: {
    label: "Round Robin",
    icon: Rows3,
    description: "Everyone plays everyone",
  },
  swiss: {
    label: "Swiss",
    icon: Shuffle,
    description: "Paired by performance each round",
  },
};

export const STATUS_VARIANT: Record<
  TournamentStatus,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  draft: "secondary",
  registration: "warning",
  seeding: "default",
  ongoing: "success",
  completed: "outline",
  cancelled: "destructive",
};

export const BRACKET_TYPE_LABELS: Record<TournamentBracketType, string> = {
  winners: "Winners",
  losers: "Losers",
  consolation: "Consolation",
  pool: "Pool",
  swiss: "Swiss",
  knockout: "Knockout",
};

export function isPoolFormat(format: TournamentFormat) {
  return format === "round_robin" || format === "swiss";
}

export function isElimFormat(format: TournamentFormat) {
  return format === "single_elimination" || format === "double_elimination";
}

export function tournamentEntryPesos(row: {
  entry_fee_cents?: number | null;
}) {
  return (row.entry_fee_cents ?? 0) / 100;
}

export const SELECT_CLASS =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";
