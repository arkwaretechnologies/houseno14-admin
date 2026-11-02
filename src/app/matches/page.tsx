"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Play,
  Flag,
  Trophy,
  Swords,
  Clock,
  Minus,
  PlusCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BranchSelect } from "@/components/shared/branch-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_COURTS, DEMO_MATCHES, DEMO_MEMBERS } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store";
import type { Match } from "@/types";
import {
  completeMatchWithResult,
  listOpenPlayMatches,
  startOpenPlayMatch,
  updateOpenPlayMatchScore,
} from "@/services/queue";

const EXTRA_MATCHES: Match[] = [
  {
    id: "match-2",
    branch_id: "branch-1",
    court_id: DEMO_COURTS[1]?.id ?? "c2",
    tournament_id: null,
    status: "completed",
    team_a: ["m2", "m3"],
    team_b: ["m1", "m4"],
    team_a_names: ["Mia Santos", "Noah Reyes"],
    team_b_names: ["Jordan Cruz", "Ava Lim"],
    score_a: 11,
    score_b: 7,
    winner_team: "a",
    started_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 2.5 * 3600000).toISOString(),
    duration_minutes: 32,
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    court: DEMO_COURTS[1],
    source: "manual",
  },
  {
    id: "match-3",
    branch_id: "branch-1",
    court_id: DEMO_COURTS[2]?.id ?? "c3",
    tournament_id: null,
    status: "completed",
    team_a: ["m5", "m1"],
    team_b: ["m2", "m3"],
    score_a: 9,
    score_b: 11,
    winner_team: "b",
    started_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    ended_at: new Date(Date.now() - 25.4 * 3600000).toISOString(),
    duration_minutes: 36,
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    court: DEMO_COURTS[2],
    source: "manual",
  },
];

function teamNames(m: Match, team: "a" | "b") {
  const names = team === "a" ? m.team_a_names : m.team_b_names;
  if (names && names.length > 0) return names.join(" & ");
  const ids = team === "a" ? m.team_a : m.team_b;
  return ids.map(() => "Player").join(" & ") || "Team";
}

export default function MatchesPage() {
  const { isDemoMode, branch } = useAuthStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishingId, setFinishingId] = useState<string | null>(null);

  async function loadLive() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!branch?.id) {
      setMatches([]);
      return;
    }
    const rows = await listOpenPlayMatches(supabase, {
      branchId: branch.id,
      statuses: ["assigned", "active", "completed"],
      limit: 50,
    });
    setMatches(rows);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemoMode) {
        if (!cancelled) {
          setMatches([...DEMO_MATCHES, ...EXTRA_MATCHES]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        await loadLive();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load matches";
        toast.error(message);
        if (!cancelled) setMatches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, branch?.id]);

  const current = useMemo(
    () =>
      matches.filter(
        (m) => m.status === "in_progress" || m.status === "scheduled"
      ),
    [matches]
  );
  const completed = useMemo(
    () =>
      matches.filter(
        (m) => m.status === "completed" || m.status === "cancelled"
      ),
    [matches]
  );

  const adjustScore = (id: string, team: "a" | "b", delta: number) => {
    let nextA = 0;
    let nextB = 0;
    let source: Match["source"] | undefined;

    setMatches((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        nextA = team === "a" ? Math.max(0, m.score_a + delta) : m.score_a;
        nextB = team === "b" ? Math.max(0, m.score_b + delta) : m.score_b;
        source = m.source;
        return { ...m, score_a: nextA, score_b: nextB };
      })
    );

    // Persist so a reload after finish/auto-seat does not wipe the score.
    if (!isDemoMode && source === "open_play") {
      void (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await updateOpenPlayMatchScore(supabase, id, nextA, nextB);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to save score";
          toast.error(message);
        }
      })();
    }
  };

  const startMatch = async (m: Match) => {
    if (isDemoMode || m.source !== "open_play") {
      setMatches((prev) =>
        prev.map((row) =>
          row.id === m.id
            ? {
                ...row,
                status: "in_progress",
                started_at: new Date().toISOString(),
              }
            : row
        )
      );
      toast.success("Match started");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await startOpenPlayMatch(supabase, m.id);
      setMatches((prev) =>
        prev.map((row) =>
          row.id === m.id
            ? {
                ...row,
                status: "in_progress",
                started_at: row.started_at ?? new Date().toISOString(),
              }
            : row
        )
      );
      toast.success("Match started");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start match";
      toast.error(message);
    }
  };

  const finishMatch = async (m: Match) => {
    // Always read latest scores from state (card prop can be stale after edits).
    const latest = matches.find((row) => row.id === m.id) ?? m;
    if (latest.score_a === latest.score_b) {
      toast.error(
        "Set a winning score first (teams can’t finish tied)."
      );
      return;
    }
    const winner = latest.score_a > latest.score_b ? "a" : "b";
    const scoreA = latest.score_a;
    const scoreB = latest.score_b;

    const markCompletedLocally = () => {
      setMatches((prev) =>
        prev.map((match) =>
          match.id === latest.id
            ? {
                ...match,
                status: "completed",
                ended_at: new Date().toISOString(),
                winner_team: winner,
                score_a: scoreA,
                score_b: scoreB,
                duration_minutes: match.started_at
                  ? Math.max(
                      1,
                      Math.round(
                        (Date.now() - new Date(match.started_at).getTime()) /
                          60000
                      )
                    )
                  : null,
              }
            : match
        )
      );
    };

    if (isDemoMode || latest.source !== "open_play") {
      markCompletedLocally();
      toast.success(`Match finished — Team ${winner.toUpperCase()} wins!`);
      return;
    }

    setFinishingId(latest.id);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await completeMatchWithResult(
        supabase,
        latest.id,
        scoreA,
        scoreB,
        winner
      );
      markCompletedLocally();
      toast.success(`Match finished — Team ${winner.toUpperCase()} wins!`, {
        description:
          "Court is free. Seat the next group from Open Play Queue with Generate This Match or Create Manual Match.",
      });
      try {
        await loadLive();
      } catch {
        // Keep optimistic completed state if refresh fails.
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to finish match";
      toast.error(message);
    } finally {
      setFinishingId(null);
    }
  };

  const createMatch = () => {
    if (!isDemoMode) {
      toast.message("Open play matches are created from the Queue", {
        description: "Use Auto Match on Open Play Queue to generate matches.",
      });
      return;
    }
    const shuffled = [...DEMO_MEMBERS]
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
    const court =
      DEMO_COURTS.find((c) => c.status === "available") ?? DEMO_COURTS[0];
    const newMatch: Match = {
      id: `match-${Date.now()}`,
      branch_id: branch?.id ?? "branch-1",
      court_id: court.id,
      tournament_id: null,
      status: "scheduled",
      team_a: [shuffled[0].id, shuffled[1].id],
      team_b: [shuffled[2].id, shuffled[3].id],
      team_a_names: [shuffled[0].full_name, shuffled[1].full_name],
      team_b_names: [shuffled[2].full_name, shuffled[3].full_name],
      score_a: 0,
      score_b: 0,
      winner_team: null,
      started_at: null,
      ended_at: null,
      duration_minutes: null,
      created_at: new Date().toISOString(),
      court,
      source: "manual",
    };
    setMatches((prev) => [newMatch, ...prev]);
    toast.success("Manual match created");
  };

  const refresh = async () => {
    if (isDemoMode) {
      setMatches([...DEMO_MATCHES, ...EXTRA_MATCHES]);
      toast.success("Matches refreshed");
      return;
    }
    setLoading(true);
    try {
      await loadLive();
      toast.success("Matches refreshed");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to refresh matches";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Matches"
        description={
          isDemoMode
            ? "Sample matches for training. Matches appear here after you generate them from Open Play Queue."
            : `Open play matches${branch ? ` · ${branch.name}` : ""}`
        }
        actions={
          <>
            <BranchSelect id="matches-branch" />
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={createMatch}>
              <Plus className="h-4 w-4" />
              Create Match
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading matches…
        </div>
      ) : (
        <Tabs defaultValue="current">
          <TabsList>
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            {current.length === 0 ? (
              <EmptyState
                title="No active matches"
                description="No matches in progress. Create one from Open Play Queue when courts are ready."
                icon={<Swords className="h-6 w-6" />}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {current.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.06 }}
                  >
                    <Card className="flex h-full flex-col">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base">
                          {m.court?.name ?? "Unassigned"}
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          {m.source === "open_play" ? (
                            <Badge variant="outline" className="text-[10px]">
                              Open play
                            </Badge>
                          ) : null}
                          <Badge
                            variant={
                              m.status === "in_progress"
                                ? "success"
                                : "secondary"
                            }
                          >
                            {m.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between rounded-2xl bg-background/50 p-3">
                            <span className="truncate text-sm font-medium">
                              {teamNames(m, "a")}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => adjustScore(m.id, "a", -1)}
                                disabled={m.status !== "in_progress"}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-6 text-center text-lg font-bold">
                                {m.score_a}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => adjustScore(m.id, "a", 1)}
                                disabled={m.status !== "in_progress"}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-2xl bg-background/50 p-3">
                            <span className="truncate text-sm font-medium">
                              {teamNames(m, "b")}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => adjustScore(m.id, "b", -1)}
                                disabled={m.status !== "in_progress"}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-6 text-center text-lg font-bold">
                                {m.score_b}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => adjustScore(m.id, "b", 1)}
                                disabled={m.status !== "in_progress"}
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {m.started_at ? (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Started {formatDateTime(m.started_at)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Not started yet
                          </p>
                        )}

                        {m.status === "in_progress" &&
                        m.score_a === 0 &&
                        m.score_b === 0 ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Use + / − to set the score, then finish.
                          </p>
                        ) : null}

                        <div className="mt-auto flex gap-2 pt-2">
                          {m.status === "scheduled" ? (
                            <Button
                              className="flex-1"
                              size="sm"
                              onClick={() => void startMatch(m)}
                            >
                              <Play className="h-3.5 w-3.5" />
                              Start
                            </Button>
                          ) : (
                            <Button
                              className="flex-1"
                              size="sm"
                              variant="soft"
                              disabled={
                                finishingId === m.id || m.score_a === m.score_b
                              }
                              title={
                                m.score_a === m.score_b
                                  ? "Set a winning score before finishing"
                                  : undefined
                              }
                              onClick={() => void finishMatch(m)}
                            >
                              {finishingId === m.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Flag className="h-3.5 w-3.5" />
                              )}
                              Finish & Record Winner
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completed.length === 0 ? (
              <EmptyState title="No completed matches yet" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {completed.map((m) => (
                  <Card key={m.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base">
                        {m.court?.name ?? "Court"}
                      </CardTitle>
                      <Badge variant="secondary">
                        {m.duration_minutes ?? "—"} min
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div
                        className={`flex items-center justify-between rounded-2xl p-3 ${
                          m.winner_team === "a"
                            ? "bg-emerald-500/10"
                            : "bg-background/50"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {m.winner_team === "a" ? (
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          ) : null}
                          {teamNames(m, "a")}
                        </span>
                        <span className="text-lg font-bold">{m.score_a}</span>
                      </div>
                      <div
                        className={`flex items-center justify-between rounded-2xl p-3 ${
                          m.winner_team === "b"
                            ? "bg-emerald-500/10"
                            : "bg-background/50"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
                          {m.winner_team === "b" ? (
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          ) : null}
                          {teamNames(m, "b")}
                        </span>
                        <span className="text-lg font-bold">{m.score_b}</span>
                      </div>
                      <p className="pt-1 text-xs text-muted-foreground">
                        Ended {m.ended_at ? formatDateTime(m.ended_at) : "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </DashboardShell>
  );
}
