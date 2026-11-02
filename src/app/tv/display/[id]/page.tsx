"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ListOrdered, Map as MapIcon, RadioTower, Clock3 } from "lucide-react";
import { DEMO_TV } from "@/lib/demo-data";
import {
  listTvCourtBoard,
  listTvLobbyQueueBoard,
  type TvCourtBoardRow,
  type TvLobbyQueueBoard,
} from "@/services/courts";
import { enqueueMatchAnnouncements, preloadPiperVoice, setTtsEnabled } from "@/lib/tts/piper";
import { TtsControls } from "@/components/open-play/tts-controls";
import {
  FocusedMatchCall,
  type FocusedMatchCallData,
} from "@/components/tv/focused-match-call";
import { AiVoiceAgentLoader } from "@/components/tv/ai-voice-agent-loader";
import { cn } from "@/lib/utils";
import { APP_NAME, type CourtStatus } from "@/lib/constants";
import { BrandMark } from "@/components/shared/brand-mark";
import type { TvDisplay } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keep called matches visible in Now Calling after announcement. */
const NOW_CALLING_HOLD_MS = 3 * 60 * 1000;
/** Minimum time to show the voice boot overlay so the progress anim reads clearly. */
const VOICE_BOOT_MIN_MS = 1600;

type NowCallingCard = {
  id: string;
  court_name: string;
  team_a: string[];
  team_b: string[];
  calledAt: number;
};

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

const COURT_STATUS_STYLE: Record<CourtStatus, string> = {
  available: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  occupied: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  reserved: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  maintenance: "border-rose-400/40 bg-rose-500/10 text-rose-300",
  closed: "border-white/10 bg-white/5 text-white/50",
};

type ViewMode = "queue" | "court_status";

function emptyQueueBoard(): TvLobbyQueueBoard {
  return {
    session_id: null,
    matching_style: "auto_balanced",
    next_matches: [],
    waiting: [],
  };
}

export default function TvDisplayFullscreenPage() {
  const params = useParams<{ id: string }>();
  const demoDisplay = useMemo(
    () => DEMO_TV.find((d) => d.id === params.id) ?? DEMO_TV[0],
    [params.id]
  );

  const [display, setDisplay] = useState<TvDisplay | null>(demoDisplay ?? null);
  const [branchId, setBranchId] = useState<string | null>(null);

  const rotateSeconds = display?.rotate_seconds ?? 20;
  const autoRotate = display?.auto_rotate ?? true;

  const [view, setView] = useState<ViewMode>(
    demoDisplay?.layout === "court_status" ? "court_status" : "queue"
  );
  // null until mount — avoids SSR/client clock mismatch (hydration error)
  const [now, setNow] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(rotateSeconds);
  const [board, setBoard] = useState<TvCourtBoardRow[]>([]);
  const [queueBoard, setQueueBoard] =
    useState<TvLobbyQueueBoard>(emptyQueueBoard);
  const [liveSync, setLiveSync] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [focusedCall, setFocusedCall] = useState<FocusedMatchCallData | null>(
    null
  );
  const [calledHold, setCalledHold] = useState<NowCallingCard[]>([]);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceBootProgress, setVoiceBootProgress] = useState(0);
  const [voiceBootStatus, setVoiceBootStatus] = useState<"loading" | "error">(
    "loading"
  );
  const announcedMatchIds = useRef<Set<string>>(new Set());
  const nextMatchesReady = useRef(false);
  const boardReady = useRef(false);

  const pinNowCalling = useCallback(
    (item: {
      id: string;
      courtName: string;
      teamA: string[];
      teamB: string[];
    }) => {
      const court = item.courtName.trim();
      if (!court) return;
      const calledAt = Date.now();
      setCalledHold((prev) => {
        const without = prev.filter(
          (c) => c.id !== item.id && c.court_name !== court
        );
        return [
          {
            id: item.id,
            court_name: court,
            team_a: item.teamA,
            team_b: item.teamB,
            calledAt,
          },
          ...without,
        ];
      });
    },
    []
  );

  // Boot AI voice agent before any match callouts
  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const started = performance.now();

    const tickProgress = (target: number) => {
      cancelAnimationFrame(raf);
      const step = () => {
        if (cancelled) return;
        setVoiceBootProgress((prev) => {
          if (prev >= target) return prev;
          const next = Math.min(target, prev + Math.max(0.8, (target - prev) * 0.12));
          if (next < target) raf = requestAnimationFrame(step);
          return next;
        });
      };
      raf = requestAnimationFrame(step);
    };

    tickProgress(18);

    void (async () => {
      try {
        tickProgress(42);
        await preloadPiperVoice();
        if (cancelled) return;
        tickProgress(92);
        const elapsed = performance.now() - started;
        const wait = Math.max(0, VOICE_BOOT_MIN_MS - elapsed);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        setVoiceBootProgress(100);
        setTtsEnabled(true);
        // Brief beat at 100% so the bar finishes visually
        await new Promise((r) => setTimeout(r, 280));
        if (cancelled) return;
        setVoiceReady(true);
      } catch (err) {
        console.error(err);
        if (cancelled) return;
        setVoiceBootStatus("error");
        setVoiceBootProgress(100);
        setTtsEnabled(true);
        await new Promise((r) => setTimeout(r, 600));
        if (!cancelled) setVoiceReady(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  const resolveBranchId = useCallback(
    async (
      supabase: Awaited<
        ReturnType<typeof import("@/lib/supabase/client")["createClient"]>
      >
    ) => {
      const fromQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("branch")
          : null;
      if (isUuid(fromQuery)) return fromQuery;

      if (isUuid(params.id)) {
        const { data: tvRow } = await supabase
          .from("tv_displays")
          .select(
            "id, branch_id, name, layout, is_active, auto_rotate, rotate_seconds, config, created_at"
          )
          .eq("id", params.id)
          .maybeSingle();
        if (tvRow) {
          setDisplay({
            id: tvRow.id,
            branch_id: tvRow.branch_id,
            name: tvRow.name,
            layout: tvRow.layout as TvDisplay["layout"],
            is_active: tvRow.is_active,
            auto_rotate: tvRow.auto_rotate,
            rotate_seconds: tvRow.rotate_seconds,
            config: (tvRow.config as TvDisplay["config"]) ?? {},
            created_at: tvRow.created_at,
          });
          if (isUuid(tvRow.branch_id)) return tvRow.branch_id;
        }
      }

      if (isUuid(demoDisplay?.branch_id)) return demoDisplay.branch_id;

      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .order("name", { ascending: true })
        .limit(1);
      return branches?.[0]?.id ?? null;
    },
    [demoDisplay?.branch_id, params.id]
  );

  const loadLiveData = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const resolvedBranchId = branchId ?? (await resolveBranchId(supabase));
      if (resolvedBranchId && resolvedBranchId !== branchId) {
        setBranchId(resolvedBranchId);
      }

      const [courts, queue] = await Promise.all([
        listTvCourtBoard(supabase, resolvedBranchId),
        listTvLobbyQueueBoard(supabase, resolvedBranchId),
      ]);
      setBoard(courts);
      setQueueBoard(queue);
      setLiveSync(true);
      setLoadError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load live TV data";
      setLoadError(message);
      setLiveSync(false);
      setBoard((prev) => (prev.length > 0 ? prev : []));
      setQueueBoard((prev) =>
        prev.session_id ||
        prev.waiting.length > 0 ||
        prev.next_matches.length > 0
          ? prev
          : emptyQueueBoard()
      );
    }
  }, [branchId, resolveBranchId]);

  useEffect(() => {
    setNow(new Date());
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    void loadLiveData();

    let channel: ReturnType<
      Awaited<
        ReturnType<typeof import("@/lib/supabase/client")["createClient"]>
      >["channel"]
    > | null = null;
    let supabase: Awaited<
      ReturnType<typeof import("@/lib/supabase/client")["createClient"]>
    > | null = null;

    void (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        supabase = createClient();
        channel = supabase
          .channel("tv-display-live")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "courts" },
            () => {
              void loadLiveData();
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "open_play_matches" },
            () => {
              void loadLiveData();
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "open_play_match_players" },
            () => {
              void loadLiveData();
            }
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "open_play_queue" },
            () => {
              void loadLiveData();
            }
          )
          .subscribe();
      } catch {
        setLiveSync(false);
      }
    })();

    return () => {
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadLiveData]);

  useEffect(() => {
    if (!autoRotate || focusedCall) return;
    setCountdown(rotateSeconds);
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setView((v) => (v === "queue" ? "court_status" : "queue"));
          return rotateSeconds;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [autoRotate, rotateSeconds, focusedCall]);

  useEffect(() => {
    setView(display?.layout === "court_status" ? "court_status" : "queue");
  }, [display?.layout]);

  // Announce only when a next_matches item newly gains a real court (skip previews)
  // Wait until AI voice agent boot finishes, then announce current + future matches.
  useEffect(() => {
    if (!voiceReady) return;

    const withCourt = queueBoard.next_matches
      .slice(0, 3)
      .filter(
        (m) =>
          Boolean(m.court_name?.trim()) &&
          (m.team_a.length > 0 || m.team_b.length > 0)
      );

    const pending = nextMatchesReady.current
      ? withCourt.filter((m) => !announcedMatchIds.current.has(m.id))
      : withCourt;

    nextMatchesReady.current = true;

    if (pending.length === 0) return;

    for (const m of pending) announcedMatchIds.current.add(m.id);

    void enqueueMatchAnnouncements(
      pending.map((m) => ({
        id: m.id,
        courtName: m.court_name as string,
        teamA: m.team_a,
        teamB: m.team_b,
      })),
      {
        requireEnabled: true,
        pauseBetweenMs: 900,
        onStart: (item) => {
          pinNowCalling(item);
          setFocusedCall({
            id: item.id,
            courtName: item.courtName,
            teamA: item.teamA,
            teamB: item.teamB,
          });
          setView("queue");
        },
        onQueueDone: () => setFocusedCall(null),
      }
    );
  }, [queueBoard.next_matches, pinNowCalling, voiceReady]);

  // Announce newly assigned/active court matches (court board path)
  useEffect(() => {
    if (!voiceReady) return;

    const withPlayers = board.filter(
      (c) =>
        c.match_id &&
        Boolean(c.court_name?.trim()) &&
        (c.team_a.length > 0 || c.team_b.length > 0) &&
        (c.match_status === "assigned" || c.match_status === "active")
    );

    const pending = boardReady.current
      ? withPlayers.filter(
          (row) => row.match_id && !announcedMatchIds.current.has(row.match_id)
        )
      : withPlayers;

    boardReady.current = true;

    if (pending.length === 0) return;

    for (const row of pending) {
      if (row.match_id) announcedMatchIds.current.add(row.match_id);
    }

    void enqueueMatchAnnouncements(
      pending.map((row) => ({
        id: row.match_id as string,
        courtName: row.court_name,
        teamA: row.team_a,
        teamB: row.team_b,
      })),
      {
        requireEnabled: true,
        pauseBetweenMs: 900,
        onStart: (item) => {
          pinNowCalling(item);
          setFocusedCall({
            id: item.id,
            courtName: item.courtName,
            teamA: item.teamA,
            teamB: item.teamB,
          });
        },
        onQueueDone: () => setFocusedCall(null),
      }
    );
  }, [board, pinNowCalling, voiceReady]);

  // Drop expired Now Calling holds (clock tick drives re-render via `now`)
  useEffect(() => {
    const cutoff = Date.now() - NOW_CALLING_HOLD_MS;
    setCalledHold((prev) => {
      const next = prev.filter((c) => c.calledAt >= cutoff);
      return next.length === prev.length ? prev : next;
    });
  }, [now]);

  const nextMatches = queueBoard.next_matches.slice(0, 3);

  const nowCalling = useMemo(() => {
    const byCourt = new Map<string, NowCallingCard>();

    const upsert = (card: NowCallingCard) => {
      const key = card.court_name;
      const existing = byCourt.get(key);
      if (!existing || card.calledAt >= existing.calledAt) {
        byCourt.set(key, card);
      }
    };

    const liveTs = Date.now();

    for (const m of nextMatches) {
      const court = m.court_name?.trim();
      if (!court) continue;
      if (m.team_a.length === 0 && m.team_b.length === 0) continue;
      upsert({
        id: m.id,
        court_name: court,
        team_a: m.team_a,
        team_b: m.team_b,
        calledAt: liveTs,
      });
    }

    for (const row of board) {
      if (
        !row.match_id ||
        (row.match_status !== "assigned" && row.match_status !== "active")
      ) {
        continue;
      }
      if (row.team_a.length === 0 && row.team_b.length === 0) continue;
      const court = row.court_name.trim();
      if (!court) continue;
      upsert({
        id: row.match_id,
        court_name: court,
        team_a: row.team_a,
        team_b: row.team_b,
        calledAt: liveTs,
      });
    }

    const cutoff = Date.now() - NOW_CALLING_HOLD_MS;
    for (const card of calledHold) {
      if (card.calledAt < cutoff) continue;
      // Keep hold only when that court is not already live-updated
      if (!byCourt.has(card.court_name)) {
        upsert(card);
      }
    }

    return Array.from(byCourt.values()).sort((a, b) =>
      a.court_name.localeCompare(b.court_name)
    );
  }, [nextMatches, board, calledHold]);

  const upcoming = nextMatches.filter((m) => !m.court_name?.trim());
  const waiting = queueBoard.waiting;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040b07] text-white">
      {!voiceReady ? (
        <AiVoiceAgentLoader
          progress={voiceBootProgress}
          status={voiceBootStatus}
        />
      ) : null}
      <FocusedMatchCall match={focusedCall} />
      <div className="pointer-events-none absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/25 blur-[140px]" />
      <div className="pointer-events-none absolute -right-24 bottom-[-15%] h-[480px] w-[480px] rounded-full bg-emerald-400/15 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

      <div className="relative z-10 flex min-h-screen flex-col px-10 py-8 lg:px-16 lg:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BrandMark size="lg" className="shadow-2xl shadow-emerald-500/30" />
            <div>
              <BrandMark
                variant="wordmark"
                wordmarkClassName="block text-3xl text-white"
              />
              <p className="text-sm text-white/50">
                {display?.name ?? "Lobby Display"}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <TtsControls variant="tv" showEnable className="justify-end" />
            <div className="flex items-center gap-6">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium",
                liveSync
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-500/10 text-amber-300"
              )}
            >
              <RadioTower
                className={cn("h-4 w-4", liveSync && "animate-pulse")}
              />
              {liveSync
                ? "Realtime Sync Active"
                : loadError
                  ? "Live sync unavailable"
                  : "Connecting…"}
            </div>
            <div className="flex items-center gap-2 text-right">
              <Clock3 className="h-5 w-5 text-white/50" />
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {now
                    ? now.toLocaleTimeString("en-PH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "--:--:--"}
                </p>
                <p className="text-xs text-white/40">
                  {now
                    ? now.toLocaleDateString("en-PH", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                    : "\u00a0"}
                </p>
              </div>
            </div>
            </div>
          </div>
        </header>

        <div className="mt-10 flex flex-1 flex-col">
          <AnimatePresence mode="wait">
            {view === "queue" ? (
              <motion.div
                key="queue"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                <div className="mb-8 flex items-center gap-3">
                  <ListOrdered className="h-8 w-8 text-emerald-400" />
                  <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight">
                    Open Play Queue
                  </h1>
                </div>

                <div className="flex flex-1 flex-col gap-8">
                  <div className="grid flex-1 grid-cols-1 gap-8 lg:grid-cols-5">
                    <div className="lg:col-span-3">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                        Now Calling
                      </p>
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {nowCalling.length === 0 ? (
                          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40 backdrop-blur-xl xl:col-span-2">
                            No matches on court yet
                          </div>
                        ) : (
                          nowCalling.map((match, index) => (
                            <motion.div
                              key={match.id}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 18,
                                delay: index * 0.05,
                              }}
                              className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-xl"
                            >
                              <p className="text-sm font-medium uppercase tracking-wide text-amber-300">
                                {match.court_name}
                              </p>

                              <div className="mt-5 space-y-3">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                                    Team A
                                  </p>
                                  <p className="mt-1 text-2xl font-bold leading-snug tracking-tight">
                                    {match.team_a.join(" & ") || "—"}
                                  </p>
                                </div>
                                <p className="text-center text-xs font-bold uppercase tracking-[0.35em] text-amber-300/60">
                                  vs
                                </p>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                                    Team B
                                  </p>
                                  <p className="mt-1 text-2xl font-bold leading-snug tracking-tight">
                                    {match.team_b.join(" & ") || "—"}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                        Waiting List
                      </p>
                      {waiting.length === 0 ? (
                        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40 backdrop-blur-xl">
                          No players waiting
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {waiting.map((q, i) => (
                            <div
                              key={q.id}
                              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"
                            >
                              <div className="flex items-center gap-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 font-mono text-lg font-bold text-emerald-300">
                                  {q.position ?? i + 1}
                                </span>
                                <p className="text-xl font-medium">
                                  {q.full_name}
                                </p>
                              </div>
                              {q.priority > 0 ? (
                                <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                                  Priority
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-white/50">
                      Upcoming
                    </p>
                    {upcoming.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-sm text-white/35 backdrop-blur-xl">
                        No upcoming pairings waiting for a court
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {upcoming.map((match, index) => (
                          <motion.div
                            key={match.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-xl"
                          >
                            <p className="text-xs font-medium uppercase tracking-wide text-white/40">
                              Waiting for a court
                            </p>
                            <div className="mt-3 flex items-center gap-3 text-lg font-semibold leading-snug">
                              <span className="min-w-0 flex-1 truncate">
                                {match.team_a.join(" & ") || "—"}
                              </span>
                              <span className="shrink-0 text-xs font-bold uppercase tracking-[0.3em] text-white/30">
                                vs
                              </span>
                              <span className="min-w-0 flex-1 truncate text-right">
                                {match.team_b.join(" & ") || "—"}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="courts"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                <div className="mb-8 flex items-center gap-3">
                  <MapIcon className="h-8 w-8 text-emerald-400" />
                  <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight">
                    Court Status
                  </h1>
                </div>

                {board.length === 0 ? (
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/40 backdrop-blur-xl">
                    No courts available
                  </div>
                ) : (
                  <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {board.map((court) => {
                      const hasMatch =
                        Boolean(court.match_id) &&
                        (court.team_a.length > 0 || court.team_b.length > 0);

                      return (
                        <div
                          key={court.court_id}
                          className={cn(
                            "flex flex-col justify-between rounded-3xl border p-7 backdrop-blur-xl",
                            COURT_STATUS_STYLE[court.court_status]
                          )}
                        >
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
                              Court {court.court_code}
                            </p>
                            <p className="mt-3 text-3xl font-bold tracking-tight">
                              {court.court_name}
                            </p>
                          </div>

                          {hasMatch ? (
                            <div className="mt-8 space-y-4">
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                                {court.match_status === "assigned"
                                  ? "Assigned"
                                  : "Now Playing"}
                              </p>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide opacity-50">
                                    Team A
                                  </p>
                                  <p className="mt-1 text-xl font-semibold leading-snug">
                                    {court.team_a.join(" & ") || "—"}
                                  </p>
                                </div>
                                <p className="text-center text-sm font-bold uppercase tracking-[0.3em] opacity-40">
                                  vs
                                </p>
                                <div>
                                  <p className="text-xs font-medium uppercase tracking-wide opacity-50">
                                    Team B
                                  </p>
                                  <p className="mt-1 text-xl font-semibold leading-snug">
                                    {court.team_b.join(" & ") || "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="mt-8 text-xl font-semibold uppercase tracking-wide">
                              {court.court_status.replace("_", " ")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-8 flex items-center justify-between text-sm text-white/40">
          <p>{APP_NAME} · Live Lobby Display</p>
          {autoRotate ? (
            <p>
              Auto-rotating in{" "}
              <span className="font-mono text-emerald-300">{countdown}s</span> ·{" "}
              {view === "queue" ? "Queue" : "Court Status"} view
            </p>
          ) : (
            <p>
              Auto-rotate disabled · Static{" "}
              {view === "queue" ? "queue" : "court status"} view
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
