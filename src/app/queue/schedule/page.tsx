"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  Clock,
  Loader2,
  Map,
  Plus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_OPEN_PLAY_SESSIONS } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/utils";
import {
  MATCHING_STYLES,
  MATCHING_STYLE_LABELS,
  type MatchingStyle,
} from "@/lib/constants";
import { useAuthStore } from "@/store";
import { BranchSelect } from "@/components/shared/branch-select";
import { SessionPlayersPanel } from "@/components/open-play/session-players-panel";
import {
  activateDueSessions,
  cancelScheduledSession,
  createScheduledSession,
  listOpenPlaySessions,
  sessionCourtNames,
  type OpenPlaySessionRow,
  type OpenPlaySessionStatus,
} from "@/services/sessions";

const STATUS_VARIANT: Record<
  OpenPlaySessionStatus,
  "warning" | "success" | "secondary"
> = {
  scheduled: "warning",
  open: "success",
  closed: "secondary",
};

const STATUS_FILTERS = ["scheduled", "open", "closed", "all"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  scheduled: "Scheduled",
  open: "Open",
  closed: "Closed",
  all: "All statuses",
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartLocal() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

function defaultEndLocal() {
  const d = new Date();
  d.setHours(d.getHours() + 5, 0, 0, 0);
  return toLocalInputValue(d);
}

export default function OpenPlaySchedulePage() {
  const { isDemoMode, branch } = useAuthStore();
  const [sessions, setSessions] = useState<OpenPlaySessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [startsLocal, setStartsLocal] = useState(defaultStartLocal);
  const [endsLocal, setEndsLocal] = useState(defaultEndLocal);
  const [maxPlayers, setMaxPlayers] = useState(32);
  const [matchingStyle, setMatchingStyle] =
    useState<MatchingStyle>("auto_balanced");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  // Default to all so open sessions (with the live roster) stay visible next to scheduled ones.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  async function loadLive() {
    if (!branch?.id) {
      setSessions([]);
      return;
    }

    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();

    await activateDueSessions(supabase, branch.id);
    const sessionRows = await listOpenPlaySessions(supabase, branch.id, {
      from: new Date(Date.now() - 7 * 86400000).toISOString(),
    });
    setSessions(sessionRows);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (isDemoMode) {
        if (!cancelled) {
          const branchId = branch?.id;
          setSessions(
            (DEMO_OPEN_PLAY_SESSIONS as OpenPlaySessionRow[]).filter(
              (s) => !branchId || s.branch_id === branchId
            )
          );
          setLoading(false);
        }
        return;
      }

      // Wait for BranchSelect to hydrate a branch before querying.
      if (!branch?.id) {
        if (!cancelled) {
          setSessions([]);
          setLoading(false);
        }
        return;
      }

      try {
        await loadLive();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load schedule";
        toast.error(message);
        if (!cancelled) {
          setSessions([]);
        }
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

  const upcoming = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? sessions
        : sessions.filter((s) => s.status === statusFilter);
    return [...filtered].sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }, [sessions, statusFilter]);

  const selectedSession = useMemo(
    () => upcoming.find((s) => s.id === selectedSessionId) ?? null,
    [upcoming, selectedSessionId]
  );

  useEffect(() => {
    if (
      selectedSessionId &&
      !upcoming.some((s) => s.id === selectedSessionId)
    ) {
      setSelectedSessionId(null);
    }
  }, [upcoming, selectedSessionId]);

  const createSession = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Title is required");
      return;
    }
    if (!startsLocal || !endsLocal) {
      toast.error("Start and end times are required");
      return;
    }

    const startsAt = new Date(startsLocal);
    const endsAt = new Date(endsLocal);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      toast.error("Invalid date/time");
      return;
    }
    if (endsAt <= startsAt) {
      toast.error("End time must be after start time");
      return;
    }
    if (endsAt.getTime() <= Date.now()) {
      toast.error("End time must be in the future");
      return;
    }
    if (maxPlayers <= 0) {
      toast.error("Max players must be greater than 0");
      return;
    }

    setSaving(true);

    const withinRange =
      startsAt.getTime() <= Date.now() && Date.now() < endsAt.getTime();

    if (isDemoMode) {
      const row: OpenPlaySessionRow = {
        id: `ops-demo-${Date.now()}`,
        branch_id: branch?.id ?? "branch-1",
        court_id: null,
        title: trimmedTitle,
        status: withinRange ? "open" : "scheduled",
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        started_at: withinRange ? new Date().toISOString() : null,
        closed_at: null,
        max_players: maxPlayers,
        matching_style: matchingStyle,
        style_config: {},
        created_by: null,
        court: null,
        session_courts: [],
      };
      setSessions((prev) => [row, ...prev]);
      setTitle("");
      setStartsLocal(defaultStartLocal());
      setEndsLocal(defaultEndLocal());
      toast.success(withinRange ? "Session opened" : "Session scheduled", {
        description: `${trimmedTitle} · ${formatDateTime(row.starts_at)}`,
      });
      setSaving(false);
      return;
    }

    try {
      if (!branch?.id) throw new Error("No branch selected");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await createScheduledSession(supabase, {
        branchId: branch.id,
        title: trimmedTitle,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        maxPlayers,
        matchingStyle,
      });
      await loadLive();
      setTitle("");
      setStartsLocal(defaultStartLocal());
      setEndsLocal(defaultEndLocal());
      toast.success("Session saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create session";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const cancelSession = async (session: OpenPlaySessionRow) => {
    if (session.status !== "scheduled") return;

    if (isDemoMode) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                status: "closed",
                closed_at: new Date().toISOString(),
              }
            : s
        )
      );
      toast.success("Session cancelled");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await cancelScheduledSession(supabase, session.id);
      await loadLive();
      toast.success("Session cancelled");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel session";
      toast.error(message);
    }
  };

  const selectClassName =
    "flex h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <DashboardShell>
      <PageHeader
        title="Open Play Schedule"
        description={
          branch
            ? `Schedule open play for ${branch.name}. If the current time falls in the window, the session opens immediately for the queue.`
            : "Create one-off open play windows. If the current time falls in the window, the session opens immediately for the queue."
        }
        actions={<BranchSelect id="schedule-branch" />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Schedule Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="session-title">Title</Label>
              <Input
                id="session-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Evening Open Play"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-start">Starts at</Label>
              <Input
                id="session-start"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-end">Ends at</Label>
              <Input
                id="session-end"
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
              Courts are assigned on Open Play Queue for each open session.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-capacity">Max players</Label>
              <Input
                id="session-capacity"
                type="number"
                min={1}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="session-style">Matching style</Label>
              <select
                id="session-style"
                className={selectClassName}
                value={matchingStyle}
                onChange={(e) =>
                  setMatchingStyle(e.target.value as MatchingStyle)
                }
              >
                {MATCHING_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {MATCHING_STYLE_LABELS[style]}
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              onClick={() => void createSession()}
              disabled={saving || loading}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}
              Create session
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Upcoming & recent
            </CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="schedule-status-filter" className="sr-only">
                Status
              </Label>
              <select
                id="schedule-status-filter"
                className={`${selectClassName} h-9 w-full sm:w-44`}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                {STATUS_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_FILTER_LABELS[status]}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading schedule…
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                title={
                  statusFilter === "all"
                    ? "No sessions scheduled"
                    : `No ${STATUS_FILTER_LABELS[statusFilter].toLowerCase()} sessions`
                }
                description={
                  statusFilter === "scheduled"
                    ? "Create a one-off open play window to get started."
                    : "Try another status filter or create a new session."
                }
                icon={<CalendarClock className="h-6 w-6" />}
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      selectedSessionId === session.id
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-background/40"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 space-y-1.5 text-left"
                      onClick={() =>
                        setSelectedSessionId((id) =>
                          id === session.id ? null : session.id
                        )
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_VARIANT[session.status]}>
                          {session.status}
                        </Badge>
                        <span className="text-sm font-medium">
                          {session.title?.trim() || "Untitled session"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {MATCHING_STYLE_LABELS[
                          session.matching_style as MatchingStyle
                        ] ?? session.matching_style}{" "}
                        · {formatDateTime(session.starts_at)} →{" "}
                        {formatDateTime(session.ends_at)}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Map className="h-3.5 w-3.5" />
                          {sessionCourtNames(session)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Max {session.max_players}
                        </span>
                        <span className="text-primary">
                          {selectedSessionId === session.id
                            ? "Hide players"
                            : "Manage players"}
                        </span>
                      </div>
                    </button>
                    {session.status === "scheduled" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void cancelSession(session)}
                      >
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedSession ? (
        <div className="mt-4">
          <SessionPlayersPanel
            key={selectedSession.id}
            session={selectedSession}
            onClose={() => setSelectedSessionId(null)}
          />
        </div>
      ) : null}
    </DashboardShell>
  );
}
