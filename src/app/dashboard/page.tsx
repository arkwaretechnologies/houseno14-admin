"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Users,
  ListOrdered,
  Map,
  CalendarDays,
  UserCheck,
  Swords,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatWidget } from "@/components/shared/stat-widget";
import { BranchSelect } from "@/components/shared/branch-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { listCourts } from "@/services/courts";
import { listMembers } from "@/services/members";
import {
  listOpenPlayMatches,
  listQueue,
  listSelectableOpenPlaySessions,
  mapLiveQueueToEntry,
  pickDefaultQueueSession,
  queuePlayerName,
} from "@/services/queue";
import type { Court, Match, QueueEntry } from "@/types";

type DashboardStats = {
  todays_attendance: number;
  open_play_players: number;
  court_usage_percent: number;
  upcoming_reservations: number;
  active_members: number;
  current_queue: number;
};

export default function DashboardPage() {
  const { isDemoMode, branch } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [courts, setCourts] = useState<Court[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (isDemoMode) {
        if (!cancelled) {
          const { DEMO_COURTS, DEMO_QUEUE, DEMO_MATCHES, DEMO_MEMBERS } =
            await import("@/lib/demo-data");
          setCourts(DEMO_COURTS);
          setQueue(DEMO_QUEUE);
          setMatches(DEMO_MATCHES);
          setMemberCount(DEMO_MEMBERS.length);
          setLoading(false);
        }
        return;
      }

      if (!branch?.id) {
        if (!cancelled) {
          setCourts([]);
          setQueue([]);
          setMatches([]);
          setMemberCount(0);
          setLoading(false);
        }
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const [courtRows, memberResult, sessions] = await Promise.all([
          listCourts(supabase, branch.id),
          listMembers(supabase, { branchId: branch.id, pageSize: 1 }),
          listSelectableOpenPlaySessions(supabase, branch.id),
        ]);

        const session = pickDefaultQueueSession(sessions);
        const [queueRows, matchRows] = await Promise.all([
          session
            ? listQueue(supabase, session.id)
            : Promise.resolve([]),
          listOpenPlayMatches(supabase, {
            branchId: branch.id,
            statuses: ["assigned", "active"],
            limit: 20,
          }),
        ]);

        if (cancelled) return;
        setCourts(courtRows);
        setQueue(queueRows.map((row, i) => mapLiveQueueToEntry(row, i)));
        setMatches(matchRows);
        setMemberCount(memberResult.count);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load dashboard";
        toast.error(message);
        if (!cancelled) {
          setCourts([]);
          setQueue([]);
          setMatches([]);
          setMemberCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, branch?.id]);

  const stats = useMemo<DashboardStats>(() => {
    const occupied = courts.filter((c) => c.status === "occupied").length;
    const usage =
      courts.length > 0 ? Math.round((occupied / courts.length) * 100) : 0;
    const waiting = queue.filter(
      (q) => q.status === "waiting" || q.status === "called"
    ).length;
    const playing = queue.filter((q) => q.status === "playing").length;
    return {
      todays_attendance: waiting + playing,
      open_play_players: waiting + playing,
      court_usage_percent: usage,
      upcoming_reservations: 0,
      active_members: memberCount,
      current_queue: waiting,
    };
  }, [courts, queue, memberCount]);

  const liveMatches = useMemo(
    () =>
      matches.filter(
        (m) => m.status === "in_progress" || m.status === "scheduled"
      ),
    [matches]
  );

  const waitingQueue = useMemo(
    () =>
      queue
        .filter((q) => q.status === "waiting" || q.status === "called")
        .slice(0, 6),
    [queue]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Operations Overview"
        description="Live pulse of courts, queue, and players for the selected branch."
        actions={<BranchSelect />}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading dashboard…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatWidget
              title="Today's Revenue"
              value={0}
              currency
              icon={Banknote}
              delay={0.05}
            />
            <StatWidget
              title="Open Play Players"
              value={stats.open_play_players}
              icon={UserCheck}
              delay={0.1}
            />
            <StatWidget
              title="Waiting in Queue"
              value={stats.current_queue}
              icon={Users}
              delay={0.15}
            />
            <StatWidget
              title="Court Usage"
              value={`${stats.court_usage_percent}%`}
              icon={Map}
              delay={0.2}
            />
            <StatWidget
              title="Upcoming Reservations"
              value={stats.upcoming_reservations}
              icon={CalendarDays}
              delay={0.25}
            />
            <StatWidget
              title="Active Members"
              value={stats.active_members}
              icon={Users}
              delay={0.3}
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-primary" />
                  Court Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {courts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No courts for this branch.
                  </p>
                ) : (
                  courts.map((court, i) => (
                    <motion.div
                      key={court.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex items-center justify-between rounded-2xl bg-background/50 px-3 py-2.5"
                    >
                      <div>
                        <p className="font-medium">{court.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {court.is_open_play ? "Open Play" : "Exclusive"} ·{" "}
                          {formatCurrency(court.hourly_rate)}/hr
                        </p>
                      </div>
                      <Badge
                        variant={
                          court.status === "available"
                            ? "success"
                            : court.status === "maintenance"
                              ? "warning"
                              : court.status === "occupied"
                                ? "default"
                                : "secondary"
                        }
                      >
                        {court.status}
                      </Badge>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListOrdered className="h-4 w-4 text-primary" />
                  Current Queue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {waitingQueue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No one waiting right now.
                  </p>
                ) : (
                  waitingQueue.map((q, i) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        #{i + 1} {queuePlayerName(q)}
                      </span>
                      <Badge
                        variant={
                          q.status === "called" ? "warning" : "secondary"
                        }
                      >
                        {q.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Swords className="h-4 w-4 text-primary" />
                  Current Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {liveMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active open-play matches.
                  </p>
                ) : (
                  liveMatches.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl bg-background/50 p-3 text-sm"
                    >
                      <p className="font-medium">
                        {m.court?.name ?? "Unassigned"}
                      </p>
                      <p className="text-muted-foreground">
                        {(m.team_a_names ?? []).join(" & ") || "Team A"} vs{" "}
                        {(m.team_b_names ?? []).join(" & ") || "Team B"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.score_a} – {m.score_b} · {m.status.replace("_", " ")}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
