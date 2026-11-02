"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pause,
  Play,
  SkipForward,
  Trash2,
  ArrowUp,
  Wand2,
  ListOrdered,
  Info,
  Swords,
  Shuffle,
  UserPlus,
  Loader2,
  Flag,
  MapPin,
  Hand,
  CalendarClock,
  Users,
  Coffee,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_QUEUE, DEMO_COURTS, DEMO_BRANCH, DEMO_OPEN_PLAY_SESSIONS } from "@/lib/demo-data";
import { buildOpenPlayPreviewBoard } from "@/lib/open-play-preview";
import { formatDateTime, getInitials } from "@/lib/utils";
import {
  MATCHING_STYLES,
  MATCHING_STYLE_DESCRIPTIONS,
  MATCHING_STYLE_LABELS,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type MatchingStyle,
  type QueueLane,
  type SkillLevel,
} from "@/lib/constants";
import { useAuthStore } from "@/store";
import type { Court, Match, OpenPlayPlayer, QueueEntry } from "@/types";
import { BranchSelect } from "@/components/shared/branch-select";
import { PlayerManager } from "@/components/open-play/player-manager";
import { SessionPlayersPanel } from "@/components/open-play/session-players-panel";
import {
  OpenPlayPaymentDialog,
  type OpenPlayPaymentResult,
} from "@/components/open-play/open-play-payment-dialog";
import { listCourts } from "@/services/courts";
import { addPlayerToQueue } from "@/services/players";
import { getBranchFeeDefaults } from "@/services/branch-services";
import { setSessionCourts } from "@/services/sessions";
import {
  getDemoPlayers,
  setDemoPlayers,
  subscribeDemoPlayers,
} from "@/lib/demo-players";
import {
  completeMatch,
  completeMatchWithResult,
  createManualMatch,
  generateMatch,
  listActiveMatches,
  listQueue,
  listSelectableOpenPlaySessions,
  mapLiveQueueToEntry,
  pickDefaultQueueSession,
  queuePlayerName,
  setQueueEntryPaused,
  type QueueSessionCard,
} from "@/services/queue";

type TeamSlots = [string, string];
const emptyTeamSlots = (): TeamSlots => ["", ""];

const STATUS_VARIANT: Record<
  QueueEntry["status"],
  "warning" | "secondary" | "default" | "destructive" | "success"
> = {
  waiting: "secondary",
  called: "warning",
  playing: "success",
  skipped: "destructive",
  cancelled: "destructive",
  completed: "success",
};

const selectClassName =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

function enrichDemoQueue(entries: QueueEntry[]): QueueEntry[] {
  return entries.map((q, i) => ({
    ...q,
    paused: q.paused ?? false,
    lane:
      q.lane ??
      (i === 0 ? "main" : i === 1 ? "winner" : i === 2 ? "loser" : "main"),
    skill_level:
      q.skill_level ??
      (["intermediate", "advanced", "beginner", "professional"] as const)[
        i % 4
      ],
    gender: q.gender ?? q.member?.gender ?? (i % 2 === 0 ? "male" : "female"),
  }));
}

function lanesForStyle(style: MatchingStyle): { key: string; label: string }[] {
  if (style === "winner_loser") {
    return [
      { key: "main", label: "Main (first match)" },
      { key: "winner", label: "Winners" },
      { key: "loser", label: "Losers" },
    ];
  }
  if (style === "skill_separated" || style === "skill_courts") {
    return SKILL_LEVELS.map((s) => ({
      key: s,
      label: SKILL_LEVEL_LABELS[s],
    }));
  }
  return [{ key: "main", label: "Main Queue" }];
}

function defaultLaneForStyle(
  style: MatchingStyle,
  skill: SkillLevel
): string {
  if (style === "skill_separated" || style === "skill_courts") {
    return skill;
  }
  return "main";
}

export default function QueuePage() {
  const { isDemoMode, branch } = useAuthStore();
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [matchingStyle, setMatchingStyle] =
    useState<MatchingStyle>("auto_balanced");
  const [activeLane, setActiveLane] = useState<string>("main");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queueSessions, setQueueSessions] = useState<QueueSessionCard[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingQueuePlayer, setPendingQueuePlayer] =
    useState<OpenPlayPlayer | null>(null);
  const [queueFeeCents, setQueueFeeCents] = useState(15000);
  const [confirmingQueuePay, setConfirmingQueuePay] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTeamA, setManualTeamA] = useState<TeamSlots>(emptyTeamSlots);
  const [manualTeamB, setManualTeamB] = useState<TeamSlots>(emptyTeamSlots);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [assignedCourtDraft, setAssignedCourtDraft] = useState<string[]>([]);
  const [savingCourts, setSavingCourts] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState("");
  const [activeMatches, setActiveMatches] = useState<Match[]>([]);
  const [demoPlayers, setDemoPlayersState] = useState<OpenPlayPlayer[]>(() =>
    getDemoPlayers()
  );

  useEffect(
    () => subscribeDemoPlayers(() => setDemoPlayersState(getDemoPlayers())),
    []
  );

  const lanes = useMemo(() => lanesForStyle(matchingStyle), [matchingStyle]);

  const selectedSession = useMemo(
    () => queueSessions.find((s) => s.id === sessionId) ?? null,
    [queueSessions, sessionId]
  );

  const sessionCourtIds = useMemo(() => {
    const ids = new Set(
      (selectedSession?.session_courts ?? [])
        .map((sc) => sc.court?.id ?? sc.court_id)
        .filter(Boolean)
    );
    return ids;
  }, [selectedSession]);

  const openPlayCourts = useMemo(
    () => courts.filter((c) => c.is_open_play),
    [courts]
  );

  useEffect(() => {
    setAssignedCourtDraft(Array.from(sessionCourtIds));
  }, [sessionId, sessionCourtIds]);

  const selectableCourts = useMemo(() => {
    if (sessionCourtIds.size === 0) return [];
    return courts.filter(
      (c) =>
        c.is_open_play &&
        c.status === "available" &&
        sessionCourtIds.has(c.id)
    );
  }, [courts, sessionCourtIds]);

  function syncSelectedCourt(nextCourts: Court[], assignedIds: Set<string>) {
    const free = nextCourts.find(
      (c) =>
        c.is_open_play &&
        c.status === "available" &&
        assignedIds.has(c.id)
    )?.id ?? "";
    setSelectedCourtId((prev) =>
      nextCourts.some(
        (c) =>
          c.id === prev &&
          c.status === "available" &&
          assignedIds.has(c.id)
      )
        ? prev
        : free
    );
  }

  async function loadSessionQueue(
    supabase: Parameters<typeof listQueue>[0],
    activeId: string
  ) {
    const [rows, matches] = await Promise.all([
      listQueue(supabase, activeId),
      listActiveMatches(supabase, activeId),
    ]);
    setQueue(rows.map((row, i) => mapLiveQueueToEntry(row, i)));
    setActiveMatches(matches);
  }

  async function loadLiveQueue(preferredSessionId?: string | null) {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    if (!branch?.id) {
      setQueueSessions([]);
      setSessionId(null);
      setQueue([]);
      setActiveMatches([]);
      return;
    }

    const [sessions, courtRows] = await Promise.all([
      listSelectableOpenPlaySessions(supabase, branch.id),
      listCourts(supabase, branch.id),
    ]);
    setQueueSessions(sessions);
    setCourts(courtRows);

    const preferred =
      (preferredSessionId &&
        sessions.find((s) => s.id === preferredSessionId)) ||
      (sessionId && sessions.find((s) => s.id === sessionId)) ||
      pickDefaultQueueSession(sessions);

    const activeId = preferred?.id ?? null;
    setSessionId(activeId);
    if (preferred?.matching_style) {
      setMatchingStyle(preferred.matching_style);
    }

    const assigned = new Set(
      (preferred?.session_courts ?? [])
        .map((sc) => sc.court?.id ?? sc.court_id)
        .filter(Boolean)
    );
    syncSelectedCourt(courtRows, assigned);

    if (!activeId) {
      setQueue([]);
      setActiveMatches([]);
      return;
    }

    await loadSessionQueue(supabase, activeId);
  }

  const selectQueueSession = async (nextId: string) => {
    if (nextId === sessionId) return;
    const next = queueSessions.find((s) => s.id === nextId);
    if (!next) return;

    setSessionId(nextId);
    if (next.matching_style) {
      setMatchingStyle(next.matching_style);
    }
    const assigned = new Set(
      (next.session_courts ?? [])
        .map((sc) => sc.court?.id ?? sc.court_id)
        .filter(Boolean)
    );
    syncSelectedCourt(courts, assigned);

    if (isDemoMode) {
      setQueue(enrichDemoQueue(DEMO_QUEUE));
      setActiveMatches([]);
      return;
    }

    setLoadingQueue(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await loadSessionQueue(supabase, nextId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load session queue";
      toast.error(message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const toggleAssignedCourt = (courtId: string) => {
    setAssignedCourtDraft((prev) =>
      prev.includes(courtId)
        ? prev.filter((id) => id !== courtId)
        : [...prev, courtId]
    );
  };

  const saveAssignedCourts = async () => {
    if (!sessionId || !selectedSession) {
      toast.error("Select a schedule session first");
      return;
    }
    if (assignedCourtDraft.length === 0) {
      toast.error("Select at least one open-play court");
      return;
    }

    setSavingCourts(true);
    try {
      if (isDemoMode) {
        const nextCourts = assignedCourtDraft.map((courtId) => {
          const court = courts.find((c) => c.id === courtId);
          return {
            court_id: courtId,
            court: court
              ? {
                  id: court.id,
                  name: court.name,
                  status: court.status,
                  is_open_play: court.is_open_play,
                }
              : null,
          };
        });
        setQueueSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, session_courts: nextCourts } : s
          )
        );
        syncSelectedCourt(courts, new Set(assignedCourtDraft));
        toast.success("Session courts updated");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await setSessionCourts(supabase, sessionId, assignedCourtDraft);
      await loadLiveQueue(sessionId);
      toast.success("Session courts updated");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to assign courts";
      toast.error(message);
    } finally {
      setSavingCourts(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemoMode) {
        if (!cancelled) {
          const branchId = branch?.id;
          const now = Date.now();
          const demoSessions: QueueSessionCard[] = DEMO_OPEN_PLAY_SESSIONS
            .filter((s) => !branchId || s.branch_id === branchId)
            .filter((s) => {
              if (s.status === "open") return true;
              if (s.status === "scheduled") {
                const starts = new Date(s.starts_at).getTime();
                const ends = new Date(s.ends_at).getTime();
                return starts <= now && now < ends;
              }
              return false;
            })
            .map((s) => ({
              ...s,
              waiting_count:
                s.id === "ops-demo-2"
                  ? enrichDemoQueue(DEMO_QUEUE).filter(
                      (q) => q.status === "waiting" || q.status === "called"
                    ).length
                  : 0,
              session_courts: (s.session_courts ?? []).map((sc) => ({
                court_id: sc.court_id,
                court: sc.court,
              })),
            }));

          setQueueSessions(demoSessions);
          const preferred =
            pickDefaultQueueSession(demoSessions) ?? demoSessions[0] ?? null;
          setSessionId(preferred?.id ?? null);
          if (preferred?.matching_style) {
            setMatchingStyle(preferred.matching_style);
          }
          setQueue(
            preferred ? enrichDemoQueue(DEMO_QUEUE) : []
          );
          setCourts(DEMO_COURTS);
          const assigned = new Set(
            (preferred?.session_courts ?? [])
              .map((sc) => sc.court?.id ?? sc.court_id)
              .filter(Boolean)
          );
          syncSelectedCourt(DEMO_COURTS, assigned);
          setActiveMatches([]);
          setLoadingQueue(false);
        }
        return;
      }

      setLoadingQueue(true);
      try {
        await loadLiveQueue();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load queue";
        toast.error(message);
        if (!cancelled) {
          setQueue([]);
          setSessionId(null);
          setQueueSessions([]);
          setCourts([]);
          setActiveMatches([]);
        }
      } finally {
        if (!cancelled) setLoadingQueue(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, branch?.id]);

  const waitingAll = useMemo(
    () =>
      [...queue]
        .filter(
          (q) =>
            (q.status === "waiting" || q.status === "called") && !q.paused
        )
        .sort((a, b) => b.priority - a.priority || a.position - b.position),
    [queue]
  );

  // Full session board: waiting + on-court (playing). Matchmaking still uses waitingAll.
  const liveBoardAll = useMemo(() => {
    const statusRank = (status: QueueEntry["status"]) => {
      if (status === "called") return 0;
      if (status === "waiting") return 1;
      if (status === "playing") return 2;
      return 3;
    };
    return [...queue]
      .filter(
        (q) =>
          (q.status === "waiting" ||
            q.status === "called" ||
            q.status === "playing") &&
          !q.paused
      )
      .sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          b.priority - a.priority ||
          a.position - b.position
      );
  }, [queue]);

  const courtNameByQueueId = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of activeMatches) {
      if (match.status !== "in_progress" || !match.court?.name) continue;
      const ids = [...match.team_a, ...match.team_b];
      for (const entry of queue) {
        if (entry.status !== "playing") continue;
        const personId = entry.walk_in_id ?? entry.member_id;
        if (personId && ids.includes(personId)) {
          map.set(entry.id, match.court.name);
        }
      }
    }
    return map;
  }, [activeMatches, queue]);

  const resting = useMemo(
    () =>
      [...queue]
        .filter(
          (q) =>
            (q.status === "waiting" || q.status === "called") && Boolean(q.paused)
        )
        .sort((a, b) => b.priority - a.priority || a.position - b.position),
    [queue]
  );

  useEffect(() => {
    if (!sessionId) return;
    setQueueSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, waiting_count: waitingAll.length } : s
      )
    );
  }, [sessionId, waitingAll.length]);

  const waiting = useMemo(() => {
    if (matchingStyle === "auto_balanced" || matchingStyle === "mixed_doubles") {
      return waitingAll.filter((q) => (q.lane ?? "main") === "main");
    }
    if (matchingStyle === "skill_separated") {
      return waitingAll.filter(
        (q) => (q.skill_level ?? "intermediate") === activeLane
      );
    }
    return waitingAll.filter((q) => (q.lane ?? "main") === activeLane);
  }, [waitingAll, matchingStyle, activeLane]);

  const liveBoard = useMemo(() => {
    if (matchingStyle === "auto_balanced" || matchingStyle === "mixed_doubles") {
      return liveBoardAll.filter((q) => (q.lane ?? "main") === "main");
    }
    if (matchingStyle === "skill_separated") {
      return liveBoardAll.filter(
        (q) => (q.skill_level ?? "intermediate") === activeLane
      );
    }
    return liveBoardAll.filter((q) => (q.lane ?? "main") === activeLane);
  }, [liveBoardAll, matchingStyle, activeLane]);

  const nextPreview = useMemo(
    () => buildOpenPlayPreviewBoard(waiting, matchingStyle, 1).next_matches[0] ?? null,
    [waiting, matchingStyle]
  );
  const nextMatch = nextPreview
    ? [...nextPreview.team_a, ...nextPreview.team_b]
    : [];
  const canGenerate = Boolean(nextPreview);

  const manualSelectedIds = useMemo(
    () =>
      new Set(
        [...manualTeamA, ...manualTeamB].filter((id): id is string => Boolean(id))
      ),
    [manualTeamA, manualTeamB]
  );

  const canCreateManual =
    manualTeamA.every(Boolean) &&
    manualTeamB.every(Boolean) &&
    manualSelectedIds.size === 4;

  const liveMatches = useMemo(
    () =>
      activeMatches.filter(
        (m) => Boolean(m.court_id) && m.status === "in_progress"
      ),
    [activeMatches]
  );
  const upcomingMatches = useMemo(
    () =>
      activeMatches.filter(
        (m) => !m.court_id || m.status === "scheduled"
      ),
    [activeMatches]
  );

  const openManualMatch = () => {
    setManualTeamA(emptyTeamSlots());
    setManualTeamB(emptyTeamSlots());
    setManualOpen(true);
  };

  const skillCourtSummary = useMemo(() => {
    return SKILL_LEVELS.map((skill) => ({
      skill,
      courts: courts.filter(
        (c) =>
          c.is_open_play &&
          sessionCourtIds.has(c.id) &&
          (c.skill_level ?? null) === skill
      ).length,
      waiting: waitingAll.filter((q) => (q.skill_level ?? "intermediate") === skill)
        .length,
    }));
  }, [waitingAll, courts, sessionCourtIds]);

  const handleStyleChange = (style: MatchingStyle) => {
    if (waitingAll.length > 0 && style !== matchingStyle) {
      toast.message("Matching style updated", {
        description:
          "Existing waiters stay in queue; new matches will use the selected style.",
      });
    }
    setMatchingStyle(style);
    const nextLanes = lanesForStyle(style);
    setActiveLane(nextLanes[0]?.key ?? "main");
    if (style === "skill_courts" || style === "skill_separated") {
      setQueue((prev) =>
        prev.map((q) => ({
          ...q,
          lane: (q.skill_level as QueueLane | undefined) ?? "intermediate",
        }))
      );
    }
  };

  const handleSkip = (id: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "skipped" } : q))
    );
    toast.error("Player skipped");
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
    toast.error("Removed from queue");
  };

  const handlePriority = (id: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, priority: q.priority + 1 } : q))
    );
    toast.success("Moved up in priority");
  };

  const handleRest = async (id: string) => {
    if (isDemoMode) {
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, paused: true } : q))
      );
      toast.success("Player resting");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await setQueueEntryPaused(supabase, id, true);
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, paused: true } : q))
      );
      toast.success("Player resting");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to rest player";
      toast.error(message);
    }
  };

  const handleUnrest = async (id: string) => {
    if (isDemoMode) {
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, paused: false } : q))
      );
      toast.success("Returned to queue");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await setQueueEntryPaused(supabase, id, false);
      setQueue((prev) =>
        prev.map((q) => (q.id === id ? { ...q, paused: false } : q))
      );
      toast.success("Returned to queue");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to return player";
      toast.error(message);
    }
  };

  const handleAutoMatch = async () => {
    if (paused) {
      toast.error("Queue is paused");
      return;
    }
    if (!canGenerate) {
      toast.error(
        matchingStyle === "mixed_doubles"
          ? "Need 2 men and 2 women waiting"
          : "Need 4 waiting players to generate a match"
      );
      return;
    }

    const courtId = selectedCourtId || null;
    const court = courtId
      ? courts.find((c) => c.id === courtId) ?? null
      : null;

    if (courtId && !court) {
      toast.error("Selected court is no longer available");
      return;
    }

    if (court && matchingStyle === "skill_courts") {
      const skill = nextMatch[0]?.skill_level ?? "intermediate";
      if ((court.skill_level ?? null) !== skill) {
        toast.error(
          `Pick a ${SKILL_LEVEL_LABELS[skill as keyof typeof SKILL_LEVEL_LABELS] ?? skill} court`
        );
        return;
      }
    }

    if (isDemoMode) {
      if (!nextPreview) {
        toast.error("Need 4 waiting players to generate a match");
        return;
      }
      const ids = new Set(nextPreview.queue_ids);
      setQueue((prev) => prev.filter((q) => !ids.has(q.id)));
      if (court) {
        setCourts((prev) =>
          prev.map((c) =>
            c.id === court.id ? { ...c, status: "occupied" as const } : c
          )
        );
      }
      setActiveMatches((prev) => [
        {
          id: `match-${Date.now()}`,
          branch_id: branch?.id ?? DEMO_BRANCH.id,
          court_id: court?.id ?? null,
          tournament_id: null,
          session_id: sessionId,
          status: court ? "in_progress" : "scheduled",
          team_a: nextPreview.team_a.map((p) => p.id),
          team_b: nextPreview.team_b.map((p) => p.id),
          team_a_names: nextPreview.team_a_names,
          team_b_names: nextPreview.team_b_names,
          score_a: 0,
          score_b: 0,
          winner_team: null,
          started_at: new Date().toISOString(),
          ended_at: null,
          duration_minutes: null,
          created_at: new Date().toISOString(),
          court: court ?? undefined,
          source: "open_play",
        },
        ...prev,
      ]);
      if (court) {
        setSelectedCourtId(
          selectableCourts.find((c) => c.id !== court.id)?.id ?? ""
        );
      }
      toast.success(
        court
          ? `Match on ${court.name}: ${[
              ...nextPreview.team_a_names,
              ...nextPreview.team_b_names,
            ].join(", ")}`
          : `Upcoming match queued: ${[
              ...nextPreview.team_a_names,
              ...nextPreview.team_b_names,
            ].join(", ")}`
      );
      return;
    }

    if (!sessionId) {
      toast.error("No open play session");
      return;
    }

    setGenerating(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await generateMatch(supabase, sessionId, courtId);
      await loadLiveQueue(sessionId);
      toast.success(
        court
          ? `Match created on ${court.name}`
          : "Match queued as upcoming (no court assigned)"
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate match";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManualMatch = async () => {
    if (paused) {
      toast.error("Queue is paused");
      return;
    }
    if (!canCreateManual) {
      toast.error("Pick 2 players for each team");
      return;
    }

    const courtId = selectedCourtId || null;
    const court = courtId
      ? courts.find((c) => c.id === courtId) ?? null
      : null;

    if (courtId && !court) {
      toast.error("Selected court is no longer available");
      return;
    }

    const teamAIds = manualTeamA as [string, string];
    const teamBIds = manualTeamB as [string, string];
    const nameFor = (id: string) => {
      const entry = waitingAll.find((q) => q.id === id);
      return entry ? queuePlayerName(entry) : "Player";
    };
    const teamANames = teamAIds.map(nameFor);
    const teamBNames = teamBIds.map(nameFor);

    if (isDemoMode) {
      const ids = new Set([...teamAIds, ...teamBIds]);
      setQueue((prev) => prev.filter((q) => !ids.has(q.id)));
      if (court) {
        setCourts((prev) =>
          prev.map((c) =>
            c.id === court.id ? { ...c, status: "occupied" as const } : c
          )
        );
      }
      setActiveMatches((prev) => [
        {
          id: `match-${Date.now()}`,
          branch_id: branch?.id ?? DEMO_BRANCH.id,
          court_id: court?.id ?? null,
          tournament_id: null,
          session_id: sessionId,
          status: court ? "in_progress" : "scheduled",
          team_a: teamAIds,
          team_b: teamBIds,
          team_a_names: teamANames,
          team_b_names: teamBNames,
          score_a: 0,
          score_b: 0,
          winner_team: null,
          started_at: new Date().toISOString(),
          ended_at: null,
          duration_minutes: null,
          created_at: new Date().toISOString(),
          court: court ?? undefined,
          source: "open_play",
        },
        ...prev,
      ]);
      if (court) {
        setSelectedCourtId(
          selectableCourts.find((c) => c.id !== court.id)?.id ?? ""
        );
      }
      setManualOpen(false);
      toast.success(
        court
          ? `Match on ${court.name}: ${[...teamANames, ...teamBNames].join(", ")}`
          : `Upcoming match queued: ${[...teamANames, ...teamBNames].join(", ")}`
      );
      return;
    }

    if (!sessionId) {
      toast.error("No open play session");
      return;
    }

    setCreatingManual(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await createManualMatch(
        supabase,
        sessionId,
        courtId,
        teamAIds,
        teamBIds
      );
      await loadLiveQueue(sessionId);
      setManualOpen(false);
      toast.success(
        court
          ? `Match created on ${court.name}`
          : "Match queued as upcoming (no court assigned)"
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create match";
      toast.error(message);
    } finally {
      setCreatingManual(false);
    }
  };

  const handleEndMatch = async (match: Match, winner?: "a" | "b") => {
    if (matchingStyle === "winner_loser" && !winner) {
      toast.error("Pick a winning team to end Winner/Loser matches");
      return;
    }

    const freedCourtId = match.court_id;
    const freedCourt =
      courts.find((c) => c.id === freedCourtId) ?? match.court ?? null;

    if (isDemoMode) {
      const namesA = match.team_a_names ?? [];
      const namesB = match.team_b_names ?? [];
      const finishedNames = [...namesA, ...namesB];
      // Shuffle relative order so they remix as individuals
      const order = finishedNames.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const base = Date.now();
      const returned: QueueEntry[] = order.map((origIndex, i) => {
        const name = finishedNames[origIndex];
        const fromTeamA = origIndex < namesA.length;
        const isWinner =
          winner &&
          ((fromTeamA && winner === "a") || (!fromTeamA && winner === "b"));
        return {
          id: `requeue-${match.id}-${i}`,
          branch_id: branch?.id ?? DEMO_BRANCH.id,
          member_id: null,
          walk_in_id: `wi-requeue-${match.id}-${i}`,
          position: queue.length + i + 1,
          status: "waiting" as const,
          priority: 0,
          party_size: 1,
          joined_at: new Date(base + i * 1000).toISOString(),
          called_at: null,
          lane:
            matchingStyle === "winner_loser"
              ? isWinner
                ? "winner"
                : "loser"
              : "main",
          skill_level: "intermediate",
          gender: i % 2 === 0 ? "male" : "female",
          member: {
            id: `requeue-${match.id}-${i}`,
            branch_id: branch?.id ?? DEMO_BRANCH.id,
            member_code: "WALK-IN",
            full_name: name,
            email: null,
            phone: null,
            avatar_url: null,
            date_of_birth: null,
            gender: i % 2 === 0 ? ("male" as const) : ("female" as const),
            status: "active" as const,
            rfid_tag: null,
            elo_rating: 1000,
            wallet_balance: 0,
            notes: null,
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      });

      // No auto-seat — staff must Generate This Match or Create Manual Match.
      setActiveMatches((prev) => prev.filter((m) => m.id !== match.id));
      setQueue((prev) => [...prev, ...returned]);
      if (freedCourtId) {
        setCourts((prev) =>
          prev.map((c) =>
            c.id === freedCourtId
              ? { ...c, status: "available" as const }
              : c
          )
        );
        setSelectedCourtId((prev) => prev || freedCourtId);
      }
      toast.success("Match ended — players returned to waiting list", {
        description: "Use Generate This Match or Create Manual Match to seat the next group.",
      });
      return;
    }

    setEndingId(match.id);

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (winner) {
        await completeMatchWithResult(
          supabase,
          match.id,
          winner === "a" ? 11 : 0,
          winner === "b" ? 11 : 0,
          winner
        );
      } else {
        await completeMatch(supabase, match.id);
      }

      // Drop the finished card immediately so a refresh glitch can't leave it "live".
      setActiveMatches((prev) => prev.filter((m) => m.id !== match.id));

      try {
        await loadLiveQueue(sessionId);
      } catch {
        // Keep optimistic removal if the board reload fails.
      }

      toast.success("Match ended — players back on the waiting list", {
        description:
          freedCourt
            ? `${freedCourt.name} is free. Use Generate This Match or Create Manual Match.`
            : "Use Generate This Match or Create Manual Match to seat the next group.",
      });
    } catch (err) {
      try {
        await loadLiveQueue(sessionId);
      } catch {
        // ignore reload errors; surface the end-match failure below
      }
      const message =
        err instanceof Error ? err.message : "Failed to end match";
      toast.error(message);
    } finally {
      setEndingId(null);
    }
  };

  const addPlayerToQueueWithPayment = async (
    player: OpenPlayPlayer,
    payment?: OpenPlayPaymentResult
  ) => {
    setAdding(true);
    try {
      if (isDemoMode) {
        if (
          queue.some(
            (q) =>
              q.walk_in_id === player.id &&
              (q.status === "waiting" ||
                q.status === "called" ||
                q.status === "playing")
          )
        ) {
          toast.error("Player already in queue");
          return;
        }
        const skill = (player.skill_level as SkillLevel) || "intermediate";
        const entry: QueueEntry = {
          id: `player-q-${Date.now()}`,
          branch_id: branch?.id ?? DEMO_BRANCH.id,
          member_id: null,
          walk_in_id: player.id,
          position: queue.length + 1,
          status: "waiting",
          priority: 0,
          party_size: 1,
          joined_at: new Date().toISOString(),
          called_at: null,
          lane: defaultLaneForStyle(matchingStyle, skill),
          skill_level: skill,
          gender: player.gender,
          member: {
            id: player.id,
            branch_id: branch?.id ?? DEMO_BRANCH.id,
            member_code: "PLAYER",
            full_name: player.full_name,
            email: player.email,
            phone: player.phone,
            avatar_url: null,
            date_of_birth: null,
            gender: player.gender,
            status: "active",
            rfid_tag: null,
            elo_rating: 1000,
            wallet_balance: 0,
            notes: null,
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        setQueue((prev) => [...prev, entry]);
        toast.success("Player added to queue", {
          description: `${player.full_name} · ${player.gender} · ${SKILL_LEVEL_LABELS[skill]}`,
        });
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const activeId = sessionId;
      if (!activeId) {
        toast.error("No open play session", {
          description:
            "Select a schedule session card above, or create one whose window includes now.",
        });
        return;
      }

      await addPlayerToQueue(
        supabase,
        activeId,
        player.id,
        payment
          ? {
              paymentMethod: payment.method,
              amountTenderedCents: payment.amountTenderedCents ?? null,
            }
          : undefined
      );
      await loadLiveQueue(activeId);
      toast.success("Player added to queue");
    } catch (err) {
      const raw =
        err instanceof Error
          ? err.message
          : typeof err === "object" &&
              err &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Failed to add player";
      const message = /already in (the )?queue/i.test(raw)
        ? "Player already in queue"
        : raw;
      toast.error(message);
      throw err;
    } finally {
      setAdding(false);
    }
  };

  const handleAddPlayer = async (player: OpenPlayPlayer) => {
    try {
      if (
        queue.some(
          (q) =>
            q.walk_in_id === player.id &&
            (q.status === "waiting" ||
              q.status === "called" ||
              q.status === "playing")
        )
      ) {
        toast.error("Player already in queue");
        return;
      }

      let feeCents = 15000;
      if (isDemoMode) {
        feeCents = 15000;
      } else if (branch?.id) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const fees = await getBranchFeeDefaults(supabase, branch.id);
        feeCents =
          fees.walk_in_open_play_fee_cents ||
          fees.default_open_play_fee_cents ||
          0;
      }

      setQueueFeeCents(feeCents);

      if (feeCents <= 0) {
        await addPlayerToQueueWithPayment(player);
        return;
      }

      setPendingQueuePlayer(player);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start payment";
      toast.error(message);
    }
  };

  const confirmQueuePayment = async (result: OpenPlayPaymentResult) => {
    if (!pendingQueuePlayer) return;
    setConfirmingQueuePay(true);
    try {
      await addPlayerToQueueWithPayment(pendingQueuePlayer, result);
      setPendingQueuePlayer(null);
    } catch {
      // toast already shown
    } finally {
      setConfirmingQueuePay(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Open Play Queue"
        description={
          branch
            ? `Open play queue · ${branch.name}`
            : "Open play queue"
        }
        actions={
          <>
            <BranchSelect id="queue-branch" />
            <Button
              variant={paused ? "default" : "outline"}
              onClick={() => {
                setPaused((p) => !p);
                toast(paused ? "Queue resumed" : "Queue paused");
              }}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? "Resume" : "Pause Queue"}
            </Button>
            <Button
              onClick={() => void handleAutoMatch()}
              disabled={!canGenerate || paused || generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Auto Match Generator
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold tracking-tight">
            Schedule sessions
          </h3>
        </div>
        {queueSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                title="No open schedule sessions"
                description="Create a schedule whose time window includes now, or wait for a scheduled session to open."
                icon={<CalendarClock className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {queueSessions.map((session) => {
              const selected = session.id === sessionId;
              const courtLabels = (session.session_courts ?? [])
                .map((sc) => {
                  const live =
                    courts.find((c) => c.id === (sc.court?.id ?? sc.court_id)) ??
                    null;
                  const name = live?.name ?? sc.court?.name ?? "Court";
                  const status = live?.status ?? sc.court?.status ?? "unknown";
                  return { name, status };
                })
                .filter(Boolean);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => void selectQueueSession(session.id)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    selected
                      ? "border-primary/60 bg-primary/5 shadow-sm"
                      : "border-border/60 bg-background/40 hover:border-primary/30"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        session.status === "open" ? "success" : "warning"
                      }
                    >
                      {session.status}
                    </Badge>
                    {selected ? (
                      <Badge variant="default">Selected</Badge>
                    ) : null}
                  </div>
                  <p className="font-medium leading-snug">
                    {session.title?.trim() || "Untitled session"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(session.starts_at)} →{" "}
                    {formatDateTime(session.ends_at)}
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <p className="inline-flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {courtLabels.length === 0
                          ? "No courts assigned"
                          : courtLabels
                              .map((c) => `${c.name} (${c.status})`)
                              .join(", ")}
                      </span>
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {session.waiting_count} waiting
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSession ? (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Assign courts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Choose which open-play courts this session can use for matches.
            </p>
            {openPlayCourts.length === 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-300">
                No open-play courts at this branch.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {openPlayCourts.map((court) => {
                  const checked = assignedCourtDraft.includes(court.id);
                  return (
                    <label
                      key={court.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-border"
                        checked={checked}
                        onChange={() => toggleAssignedCourt(court.id)}
                      />
                      <span className="min-w-0 flex-1">{court.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {court.status}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <Button
              onClick={() => void saveAssignedCourts()}
              disabled={
                savingCourts ||
                loadingQueue ||
                assignedCourtDraft.length === 0 ||
                openPlayCourts.length === 0
              }
            >
              {savingCourts ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4" />
              )}
              Save courts
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shuffle className="h-4 w-4 text-primary" />
            Matching Style
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {MATCHING_STYLES.map((style) => (
              <Button
                key={style}
                size="sm"
                variant={matchingStyle === style ? "default" : "outline"}
                onClick={() => handleStyleChange(style)}
              >
                {MATCHING_STYLE_LABELS[style]}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {MATCHING_STYLE_DESCRIPTIONS[matchingStyle]}
          </p>
        </CardContent>
      </Card>

      {selectedSession ? (
        <div className="mb-4">
          <SessionPlayersPanel
            key={selectedSession.id}
            session={selectedSession}
            onChanged={async () => {
              await loadLiveQueue(selectedSession.id);
            }}
          />
        </div>
      ) : null}

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Walk-in to queue
          </CardTitle>
          <p className="text-xs font-normal text-muted-foreground">
            Add players who are not already on this session&apos;s schedule.
            They are also added to the session roster when queued.
          </p>
        </CardHeader>
        <CardContent>
          <PlayerManager
            branchId={branch?.id}
            isDemoMode={isDemoMode}
            demoPlayers={demoPlayers}
            onDemoPlayersChange={(next) => {
              setDemoPlayers(next);
              setDemoPlayersState(next);
            }}
            actionLabel="Add to queue"
            onSelectPlayer={handleAddPlayer}
            disabled={adding || loadingQueue || !sessionId}
            excludedPlayerIds={queue
              .filter(
                (q) =>
                  q.status === "waiting" ||
                  q.status === "called" ||
                  q.status === "playing"
              )
              .map((q) => q.walk_in_id)
              .filter((id): id is string => Boolean(id))}
            excludedActionLabel="In queue"
          />
        </CardContent>
      </Card>

      {paused ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <Info className="h-4 w-4" />
          Queue is paused — matchmaking will not run.
        </div>
      ) : null}

      {matchingStyle === "skill_courts" ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {skillCourtSummary.map((row) => (
            <Card key={row.skill} className="p-0">
              <CardContent className="p-3 text-sm">
                <p className="font-medium">{SKILL_LEVEL_LABELS[row.skill]}</p>
                <p className="text-xs text-muted-foreground">
                  {row.waiting} waiting · {row.courts} tagged courts
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <ListOrdered className="h-4 w-4 text-primary" />
              Live Queue
            </h3>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </motion.div>
          </div>

          {lanes.length > 1 ? (
            <Tabs value={activeLane} onValueChange={setActiveLane} className="mb-4">
              <TabsList className="flex h-auto flex-wrap gap-1">
                {lanes.map((lane) => (
                  <TabsTrigger key={lane.key} value={lane.key} className="text-xs">
                    {lane.label}
                    <Badge variant="secondary" className="ml-1">
                      {
                        liveBoardAll.filter((q) => {
                          if (matchingStyle === "skill_separated") {
                            return (q.skill_level ?? "intermediate") === lane.key;
                          }
                          return (q.lane ?? "main") === lane.key;
                        }).length
                      }
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
              {lanes.map((lane) => (
                <TabsContent key={lane.key} value={lane.key} className="mt-3" />
              ))}
            </Tabs>
          ) : null}

          {loadingQueue ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading queue…
            </div>
          ) : liveBoard.length === 0 ? (
            <EmptyState
              title="Queue is empty"
              description="Check players in from the session roster above, or add a walk-in."
              icon={<ListOrdered className="h-6 w-6" />}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {waiting.length} waiting
                {liveBoard.length - waiting.length > 0
                  ? ` · ${liveBoard.length - waiting.length} on court`
                  : ""}
              </p>
              <AnimatePresence initial={false}>
                {liveBoard.map((q, i) => {
                  const onCourt = q.status === "playing";
                  const courtLabel = courtNameByQueueId.get(q.id);
                  return (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="p-0">
                      <div className="flex items-center gap-4 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                          {i + 1}
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {getInitials(queuePlayerName(q))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 truncate font-medium">
                            <span className="truncate">{queuePlayerName(q)}</span>
                            {q.walk_in_id ? (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                Player
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {q.walk_in_id
                              ? "Player"
                              : `ELO ${q.member?.elo_rating ?? "—"}`}
                            {q.skill_level
                              ? ` · ${SKILL_LEVEL_LABELS[q.skill_level as SkillLevel] ?? q.skill_level}`
                              : ""}
                            {q.gender ? ` · ${q.gender}` : ""}
                            {courtLabel ? ` · ${courtLabel}` : ""}
                            {q.priority > 0 ? ` · Priority +${q.priority}` : ""}
                          </p>
                        </div>
                        <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>
                        {onCourt ? (
                          <span className="text-xs text-muted-foreground">
                            On court
                          </span>
                        ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Move up priority"
                            onClick={() => handlePriority(q.id)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Rest"
                            onClick={() => void handleRest(q.id)}
                          >
                            <Coffee className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Skip"
                            onClick={() => handleSkip(q.id)}
                          >
                            <SkipForward className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remove"
                            onClick={() => handleRemove(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <Coffee className="h-4 w-4 text-primary" />
                Resting
              </h3>
              {resting.length > 0 ? (
                <Badge variant="secondary">{resting.length}</Badge>
              ) : null}
            </div>
            {resting.length === 0 ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  No players resting. Use the coffee icon to temporarily pull someone off the queue.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {resting.map((q) => (
                    <motion.div
                      key={q.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Card className="p-0">
                        <div className="flex items-center gap-4 p-4">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {getInitials(queuePlayerName(q))}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 truncate font-medium">
                              <span className="truncate">{queuePlayerName(q)}</span>
                              {q.walk_in_id ? (
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  Player
                                </Badge>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Keeps place in queue when returned
                              {q.skill_level
                                ? ` · ${SKILL_LEVEL_LABELS[q.skill_level as SkillLevel] ?? q.skill_level}`
                                : ""}
                              {q.gender ? ` · ${q.gender}` : ""}
                            </p>
                          </div>
                          <Badge variant="warning">resting</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleUnrest(q.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Return to queue
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p>
                <span className="font-semibold text-foreground">Style:</span>{" "}
                {MATCHING_STYLE_DESCRIPTIONS[matchingStyle]}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                Next Match Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 space-y-1.5">
                <Label htmlFor="match-court" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Assign court (optional)
                </Label>
                <select
                  id="match-court"
                  className={selectClassName}
                  value={selectedCourtId}
                  onChange={(e) => setSelectedCourtId(e.target.value)}
                >
                  <option value="">No court — upcoming</option>
                  {selectableCourts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.skill_level
                        ? ` · ${SKILL_LEVEL_LABELS[c.skill_level as SkillLevel] ?? c.skill_level}`
                        : ""}
                    </option>
                  ))}
                </select>
                {selectableCourts.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-300">
                    {sessionCourtIds.size === 0
                      ? "No courts assigned — matches will go to upcoming."
                      : "No available courts right now — matches will go to upcoming."}
                  </p>
                ) : !selectedCourtId ? (
                  <p className="text-xs text-muted-foreground">
                    Leave court unselected to queue an upcoming match.
                  </p>
                ) : null}
              </div>

              {!canGenerate || !nextPreview ? (
                <p className="text-sm text-muted-foreground">
                  {matchingStyle === "mixed_doubles"
                    ? `Need ${Math.max(0, 2 - waiting.filter((q) => q.gender === "male").length)} more men and ${Math.max(0, 2 - waiting.filter((q) => q.gender === "female").length)} more women…`
                    : `Waiting for ${Math.max(0, 4 - waiting.length)} more player${4 - waiting.length === 1 ? "" : "s"}…`}
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-background/50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Team A
                    </p>
                    <p className="text-sm font-medium">
                      {nextPreview.team_a_names.join(" & ")}
                    </p>
                  </div>
                  <div className="text-center text-xs font-semibold text-muted-foreground">
                    VS
                  </div>
                  <div className="rounded-2xl bg-background/50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Team B
                    </p>
                    <p className="text-sm font-medium">
                      {nextPreview.team_b_names.join(" & ")}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => void handleAutoMatch()}
                    disabled={paused || generating}
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Generate This Match
                  </Button>
                </div>
              )}
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={openManualMatch}
                disabled={
                  paused ||
                  waitingAll.length < 4 ||
                  generating ||
                  creatingManual
                }
              >
                <Hand className="h-4 w-4" />
                Create Manual Match
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" />
                Active Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {liveMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No live matches on court.
                </p>
              ) : (
                liveMatches.map((m) => (
                  <div
                    key={m.id}
                    className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {m.court?.name ?? "Court"}
                      </p>
                      <Badge variant="success">live</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(m.team_a_names ?? []).join(" & ") || "Team A"} vs{" "}
                      {(m.team_b_names ?? []).join(" & ") || "Team B"}
                    </p>
                    {matchingStyle === "winner_loser" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={endingId === m.id}
                          onClick={() => void handleEndMatch(m, "a")}
                        >
                          {endingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : null}
                          A wins
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={endingId === m.id}
                          onClick={() => void handleEndMatch(m, "b")}
                        >
                          B wins
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        variant="soft"
                        disabled={endingId === m.id}
                        onClick={() => void handleEndMatch(m)}
                      >
                        {endingId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Flag className="h-3.5 w-3.5" />
                        )}
                        End Match
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Upcoming Matches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingMatches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No upcoming matches waiting for a court.
                </p>
              ) : (
                upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    className="space-y-2 rounded-2xl border border-border/60 bg-background/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Waiting for court</p>
                      <Badge variant="secondary">upcoming</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(m.team_a_names ?? []).join(" & ") || "Team A"} vs{" "}
                      {(m.team_b_names ?? []).join(" & ") || "Team B"}
                    </p>
                    <Button
                      size="sm"
                      className="w-full"
                      variant="outline"
                      disabled={endingId === m.id}
                      onClick={() => void handleEndMatch(m)}
                    >
                      {endingId === m.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Cancel
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create manual match</DialogTitle>
            <DialogDescription>
              Pick 2 players for Team A and 2 for Team B from anyone waiting.
              Leave court unselected to queue as an upcoming match.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="manual-match-court" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Court (optional)
            </Label>
            <select
              id="manual-match-court"
              className={selectClassName}
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
            >
              <option value="">No court — upcoming</option>
              {selectableCourts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.skill_level
                    ? ` · ${SKILL_LEVEL_LABELS[c.skill_level as SkillLevel] ?? c.skill_level}`
                    : ""}
                </option>
              ))}
            </select>
            {selectableCourts.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                {sessionCourtIds.size === 0
                  ? "No courts assigned — this match will go to upcoming."
                  : "No available courts — this match will go to upcoming."}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["Team A", manualTeamA, setManualTeamA],
                ["Team B", manualTeamB, setManualTeamB],
              ] as const
            ).map(([label, slots, setSlots]) => (
              <div key={label} className="space-y-2 rounded-xl border border-border/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                {slots.map((value, index) => (
                  <select
                    key={`${label}-${index}`}
                    className={selectClassName}
                    value={value}
                    onChange={(e) => {
                      const next: TeamSlots = [...slots] as TeamSlots;
                      next[index] = e.target.value;
                      setSlots(next);
                    }}
                  >
                    <option value="">Player {index + 1}…</option>
                    {waitingAll
                      .filter((q) => q.status === "waiting")
                      .map((q) => (
                        <option
                          key={q.id}
                          value={q.id}
                          disabled={
                            manualSelectedIds.has(q.id) && q.id !== value
                          }
                        >
                          {queuePlayerName(q)}
                          {q.skill_level
                            ? ` · ${SKILL_LEVEL_LABELS[q.skill_level as SkillLevel] ?? q.skill_level}`
                            : ""}
                        </option>
                      ))}
                  </select>
                ))}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setManualOpen(false)}
              disabled={creatingManual}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateManualMatch()}
              disabled={!canCreateManual || creatingManual || paused}
            >
              {creatingManual ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Hand className="h-4 w-4" />
              )}
              Create match
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OpenPlayPaymentDialog
        open={!!pendingQueuePlayer}
        onOpenChange={(open) => {
          if (!open) setPendingQueuePlayer(null);
        }}
        playerName={pendingQueuePlayer?.full_name ?? ""}
        feeCents={queueFeeCents}
        confirming={confirmingQueuePay || adding}
        confirmLabel="Pay & add to queue"
        onConfirm={confirmQueuePayment}
      />
    </DashboardShell>
  );
}
