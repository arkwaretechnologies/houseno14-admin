"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Medal, Trophy, TrendingUp, Swords } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatWidget } from "@/components/shared/stat-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DEMO_RANKINGS } from "@/lib/demo-data";
import { getInitials, formatPercent } from "@/lib/utils";
import type { PlayerRanking } from "@/types";

const SEASONS = ["2026-H1", "2025-H2", "2025-H1"];

const columns: ColumnDef<PlayerRanking, unknown>[] = [
  {
    accessorKey: "rank_position",
    header: "Rank",
    cell: ({ row }) => {
      const rank = row.original.rank_position;
      const medalColor =
        rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-700" : "";
      return (
        <div className="flex items-center gap-1.5 font-semibold">
          {rank <= 3 ? <Medal className={`h-4 w-4 ${medalColor}`} /> : null}
          <span>#{rank}</span>
        </div>
      );
    },
  },
  {
    id: "player",
    header: "Player",
    accessorFn: (row) => row.member?.full_name ?? "Unknown",
    cell: ({ row }) => {
      const member = row.original.member;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(member?.full_name ?? "??")}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{member?.full_name ?? "Unknown"}</p>
            <p className="text-xs text-muted-foreground">{member?.member_code}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "elo_rating",
    header: "ELO",
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-mono">
        {row.original.elo_rating}
      </Badge>
    ),
  },
  {
    accessorKey: "wins",
    header: "Wins",
    cell: ({ row }) => <span className="font-medium text-emerald-600">{row.original.wins}</span>,
  },
  {
    accessorKey: "losses",
    header: "Losses",
    cell: ({ row }) => <span className="font-medium text-rose-500">{row.original.losses}</span>,
  },
  {
    accessorKey: "win_rate",
    header: "Win %",
    cell: ({ row }) => formatPercent(row.original.win_rate),
  },
  {
    accessorKey: "matches_played",
    header: "Matches",
  },
];

export default function RankingsPage() {
  const [season, setSeason] = useState(SEASONS[0]);
  const rankings = DEMO_RANKINGS;

  const topPlayer = rankings[0];
  const avgElo = useMemo(
    () => Math.round(rankings.reduce((sum, r) => sum + r.elo_rating, 0) / rankings.length),
    [rankings]
  );
  const totalMatches = useMemo(
    () => rankings.reduce((sum, r) => sum + r.matches_played, 0),
    [rankings]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="ELO Rankings"
        description="Season leaderboard tracking competitive standing across all members."
        actions={
          <div className="flex gap-2">
            {SEASONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={season === s ? "default" : "outline"}
                onClick={() => setSeason(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          title="Top Player"
          value={topPlayer?.member?.full_name ?? "—"}
          hint={`${topPlayer?.elo_rating ?? 0} ELO`}
          icon={Trophy}
        />
        <StatWidget title="Average ELO" value={avgElo} icon={TrendingUp} delay={0.05} />
        <StatWidget title="Matches Played" value={totalMatches} icon={Swords} delay={0.1} />
        <StatWidget title="Ranked Players" value={rankings.length} icon={Medal} delay={0.15} />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Medal className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight">Leaderboard · Season {season}</h3>
        </div>
        <DataTable
          columns={columns}
          data={rankings}
          searchPlaceholder="Search players…"
          emptyTitle="No ranked players"
          emptyDescription="Rankings will populate once ranked matches are recorded this season."
        />
      </div>
    </DashboardShell>
  );
}
