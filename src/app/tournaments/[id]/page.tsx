"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Trophy,
  UserPlus,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SKILL_LEVEL_LABELS, type SkillLevel } from "@/lib/constants";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { getDemoPlayers } from "@/lib/demo-players";
import {
  demoCheckInRegistration,
  demoGenerateBrackets,
  demoGetDivisionStandings,
  demoRecordMatchScore,
  demoRegisterPlayer,
  demoSetRegistrationSeed,
  demoStartKnockoutFromStandings,
  demoUpdateTournamentStatus,
  getDemoDivisions,
  getDemoMatches,
  getDemoRegistrations,
  getDemoTournament,
  subscribeDemoTournaments,
} from "@/lib/demo-tournaments";
import { FORMAT_META, isElimFormat } from "@/lib/tournament-ui";
import { useAuthStore } from "@/store";
import { searchPlayers } from "@/services/players";
import {
  checkInTournamentRegistration,
  generateTournamentBrackets,
  getTournament,
  getTournamentDivisionStandings,
  listTournamentDivisions,
  listTournamentMatches,
  listTournamentRegistrations,
  recordTournamentMatchScore,
  registerTournamentPlayer,
  registrationDisplayName,
  setTournamentRegistrationSeed,
  startKnockoutFromStandings,
  updateTournamentStatus,
  type TournamentDivisionRow,
  type TournamentMatchRow,
  type TournamentRegistrationRow,
  type TournamentRow,
  type TournamentStandingRow,
  type TournamentStatus,
} from "@/services/tournaments";

type MemberHit = { id: string; full_name: string | null };

export default function TournamentDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const { isDemoMode, branch } = useAuthStore();

  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [divisions, setDivisions] = useState<TournamentDivisionRow[]>([]);
  const [registrations, setRegistrations] = useState<
    TournamentRegistrationRow[]
  >([]);
  const [matches, setMatches] = useState<TournamentMatchRow[]>([]);
  const [standings, setStandings] = useState<
    Record<string, TournamentStandingRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>(
    {}
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addDivisionId, setAddDivisionId] = useState("");
  const [addMode, setAddMode] = useState<"member" | "walkin">("walkin");
  const [query, setQuery] = useState("");
  const [memberHits, setMemberHits] = useState<MemberHit[]>([]);
  const [walkInHits, setWalkInHits] = useState<
    { id: string; full_name: string }[]
  >([]);

  const load = useCallback(async () => {
    if (isDemoMode) {
      const t = getDemoTournament(id);
      setTournament(t);
      const divs = getDemoDivisions(id);
      setDivisions(divs);
      setRegistrations(getDemoRegistrations(id));
      setMatches(getDemoMatches(id));
      const next: Record<string, TournamentStandingRow[]> = {};
      for (const d of divs) {
        next[d.id] = demoGetDivisionStandings(d.id);
      }
      setStandings(next);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      const [t, divs, regs, ms] = await Promise.all([
        getTournament(client, id),
        listTournamentDivisions(client, id),
        listTournamentRegistrations(client, id),
        listTournamentMatches(client, id),
      ]);
      setTournament(t);
      setDivisions(divs);
      setRegistrations(regs);
      setMatches(ms);

      if (
        t &&
        (t.format === "round_robin" || t.format === "swiss") &&
        divs.length
      ) {
        const next: Record<string, TournamentStandingRow[]> = {};
        await Promise.all(
          divs.map(async (d) => {
            try {
              next[d.id] = await getTournamentDivisionStandings(client, d.id);
            } catch {
              next[d.id] = [];
            }
          })
        );
        setStandings(next);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id, isDemoMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isDemoMode) return;
    return subscribeDemoTournaments(() => {
      void load();
    });
  }, [isDemoMode, load]);

  useEffect(() => {
    const q = query.trim();
    if (!addOpen || q.length < 1) {
      setMemberHits([]);
      setWalkInHits([]);
      return;
    }

    if (isDemoMode) {
      const needle = q.toLowerCase();
      if (addMode === "walkin") {
        setWalkInHits(
          getDemoPlayers()
            .filter(
              (p) =>
                !p.deleted_at && p.full_name.toLowerCase().includes(needle)
            )
            .slice(0, 20)
            .map((p) => ({ id: p.id, full_name: p.full_name }))
        );
        setMemberHits([]);
      } else {
        setMemberHits(
          DEMO_MEMBERS.filter((m) =>
            m.full_name.toLowerCase().includes(needle)
          )
            .slice(0, 20)
            .map((m) => ({ id: m.id, full_name: m.full_name }))
        );
        setWalkInHits([]);
      }
      return;
    }

    if (!branch?.id || q.length < 2) {
      setMemberHits([]);
      setWalkInHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const client = createClient();
        if (addMode === "walkin") {
          const result = await searchPlayers(client, branch.id, q);
          setWalkInHits(
            result.players.map((p) => ({ id: p.id, full_name: p.full_name }))
          );
        } else {
          const { data, error } = await client
            .from("profiles")
            .select("id, full_name")
            .eq("role", "member")
            .ilike("full_name", `%${q}%`)
            .limit(20);
          if (error) throw new Error(error.message);
          setMemberHits((data ?? []) as MemberHit[]);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Search failed");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [addOpen, addMode, query, branch?.id, isDemoMode]);

  const regName = useCallback(
    (regId: string | null) => {
      if (!regId) return "TBD";
      const reg = registrations.find((r) => r.id === regId);
      return reg ? registrationDisplayName(reg) : "Player";
    },
    [registrations]
  );

  const setStatus = async (status: TournamentStatus) => {
    if (!tournament) return;
    setBusy(true);
    try {
      if (isDemoMode) {
        demoUpdateTournamentStatus(tournament.id, status);
        toast.success(`Status → ${status}`);
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await updateTournamentStatus(client, tournament.id, status);
      toast.success(`Status → ${status}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!tournament) return;
    setBusy(true);
    try {
      if (isDemoMode) {
        const count = demoGenerateBrackets(tournament.id);
        toast.success(`Generated ${count} matches`);
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      const count = await generateTournamentBrackets(client, tournament.id);
      toast.success(`Generated ${count} matches`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = async (regId: string, checkedIn: boolean) => {
    try {
      if (isDemoMode) {
        demoCheckInRegistration(regId, checkedIn);
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await checkInTournamentRegistration(client, regId, checkedIn);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Check-in failed");
    }
  };

  const handleSeed = async (regId: string, seed: number) => {
    try {
      if (isDemoMode) {
        demoSetRegistrationSeed(regId, seed);
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await setTournamentRegistrationSeed(client, regId, seed);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed update failed");
    }
  };

  const handleAddPlayer = async (opts: {
    profileId?: string;
    walkInId?: string;
  }) => {
    if (!tournament || !addDivisionId) {
      toast.error("Select a division");
      return;
    }
    setBusy(true);
    try {
      if (isDemoMode) {
        demoRegisterPlayer({
          tournamentId: tournament.id,
          divisionId: addDivisionId,
          profileId: opts.profileId,
          walkInId: opts.walkInId,
        });
        toast.success("Player registered");
        setAddOpen(false);
        setQuery("");
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await registerTournamentPlayer(client, {
        tournamentId: tournament.id,
        divisionId: addDivisionId,
        profileId: opts.profileId,
        walkInId: opts.walkInId,
      });
      toast.success("Player registered");
      setAddOpen(false);
      setQuery("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Register failed");
    } finally {
      setBusy(false);
    }
  };

  const handleScore = async (matchId: string) => {
    const s = scores[matchId];
    if (!s) return;
    const a = Number(s.a);
    const b = Number(s.b);
    if (Number.isNaN(a) || Number.isNaN(b) || a === b) {
      toast.error("Enter unequal scores");
      return;
    }
    setBusy(true);
    try {
      if (isDemoMode) {
        demoRecordMatchScore(matchId, a, b);
        toast.success("Score recorded");
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      await recordTournamentMatchScore(client, matchId, a, b);
      toast.success("Score recorded");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Score failed");
    } finally {
      setBusy(false);
    }
  };

  const handleStartKnockout = async (divisionId: string) => {
    setBusy(true);
    try {
      if (isDemoMode) {
        const n = demoStartKnockoutFromStandings(divisionId);
        toast.success(`Knockout generated (${n} matches)`);
        await load();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const client = createClient();
      const n = await startKnockoutFromStandings(client, divisionId);
      toast.success(`Knockout generated (${n} matches)`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Knockout failed");
    } finally {
      setBusy(false);
    }
  };

  const matchesByDivision = useMemo(() => {
    const map = new Map<string, TournamentMatchRow[]>();
    for (const m of matches) {
      const list = map.get(m.division_id) ?? [];
      list.push(m);
      map.set(m.division_id, list);
    }
    return map;
  }, [matches]);

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tournament…
        </div>
      </DashboardShell>
    );
  }

  if (!tournament) {
    return (
      <DashboardShell>
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="Tournament not found"
          description="It may have been deleted or you do not have access."
          action={
            <Button asChild variant="outline">
              <Link href="/tournaments">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  const formatLabel =
    FORMAT_META[tournament.format]?.label ?? tournament.format;

  return (
    <DashboardShell>
      <PageHeader
        title={tournament.name}
        description={`${formatLabel} · ${tournament.status}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/tournaments">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                Status: <Badge>{tournament.status}</Badge>
              </div>
              <div>Format: {formatLabel}</div>
              <div>Top N knockout: {tournament.advance_count ?? "—"}</div>
              <div>
                Consolation: {tournament.consolation_enabled ? "Yes" : "No"}
              </div>
              {tournament.format === "swiss" && (
                <div>Swiss rounds: {tournament.swiss_rounds}</div>
              )}
              <div>Max players: {tournament.max_players}</div>
              <div className="sm:col-span-2">
                Entry fees by division:
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  {divisions.map((d) => (
                    <li key={d.id}>
                      {d.name}: ₱
                      {((d.entry_fee_cents ?? 0) / 100).toFixed(0)}
                    </li>
                  ))}
                  {divisions.length === 0 && (
                    <li>
                      ₱
                      {((tournament.entry_fee_cents ?? 0) / 100).toFixed(0)}
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                busy ||
                tournament.status === "ongoing" ||
                tournament.status === "completed" ||
                tournament.status === "cancelled"
              }
              onClick={() => void setStatus("ongoing")}
            >
              Start
            </Button>
            <Button
              variant="outline"
              disabled={
                busy ||
                tournament.status === "completed" ||
                tournament.status === "cancelled"
              }
              onClick={() => void setStatus("completed")}
            >
              Complete
            </Button>
            <Button
              variant="destructive"
              disabled={
                busy ||
                tournament.status === "completed" ||
                tournament.status === "cancelled"
              }
              onClick={() => void setStatus("cancelled")}
            >
              Cancel
            </Button>
            {(tournament.status === "registration" ||
              tournament.status === "seeding" ||
              tournament.status === "ongoing") &&
            matches.length === 0 ? (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void handleGenerate()}
              >
                Generate brackets
              </Button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="roster" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setAddDivisionId(divisions[0]?.id ?? "");
                setAddOpen(true);
              }}
            >
              <UserPlus className="h-4 w-4" />
              Add player
            </Button>
          </div>
          {divisions.map((div) => {
            const regs = registrations.filter((r) => r.division_id === div.id);
            return (
              <Card key={div.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {div.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      (
                      {SKILL_LEVEL_LABELS[div.skill_level as SkillLevel] ??
                        div.skill_level}
                      )
                      {" · "}₱{((div.entry_fee_cents ?? 0) / 100).toFixed(0)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {regs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No players yet</p>
                  ) : (
                    regs.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                      >
                        <div>
                          <div className="font-medium">
                            {registrationDisplayName(reg)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reg.status}
                            {reg.walk_in_id ? " · walk-in" : " · member"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            className="w-20"
                            type="number"
                            min={1}
                            placeholder="Seed"
                            defaultValue={reg.seed ?? ""}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v > 0) void handleSeed(reg.id, v);
                            }}
                          />
                          <Button
                            size="sm"
                            variant={
                              reg.status === "checked_in" ? "default" : "outline"
                            }
                            onClick={() =>
                              void handleCheckIn(
                                reg.id,
                                reg.status !== "checked_in"
                              )
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {reg.status === "checked_in"
                              ? "Checked in"
                              : "Check in"}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          {matches.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-6 w-6" />}
              title="No brackets yet"
              description="Check in at least 2 players per division, then generate."
              action={
                <Button disabled={busy} onClick={() => void handleGenerate()}>
                  <Plus className="h-4 w-4" />
                  Generate brackets
                </Button>
              }
            />
          ) : (
            divisions.map((div) => {
              const divMatches = matchesByDivision.get(div.id) ?? [];
              if (!divMatches.length) return null;
              const byType = new Map<string, TournamentMatchRow[]>();
              for (const m of divMatches) {
                const list = byType.get(m.bracket_type) ?? [];
                list.push(m);
                byType.set(m.bracket_type, list);
              }
              return (
                <Card key={div.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{div.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[...byType.entries()].map(([type, list]) => {
                      const rounds = [
                        ...new Set(list.map((m) => m.round)),
                      ].sort((a, b) => a - b);
                      const columnLayout =
                        isElimFormat(tournament.format) || type === "knockout";
                      return (
                        <div key={type} className="space-y-2">
                          <h4 className="text-sm font-medium capitalize">
                            {type.replace("_", " ")}
                          </h4>
                          {columnLayout ? (
                            <div className="flex gap-4 overflow-x-auto pb-2">
                              {rounds.map((round) => (
                                <div
                                  key={round}
                                  className="min-w-[220px] space-y-2"
                                >
                                  <div className="text-xs font-medium text-muted-foreground">
                                    Round {round}
                                  </div>
                                  {list
                                    .filter((m) => m.round === round)
                                    .sort((a, b) => a.position - b.position)
                                    .map((m) => (
                                      <div
                                        key={m.id}
                                        className="rounded-xl border border-border/60 p-3 text-sm"
                                      >
                                        <div className="flex justify-between gap-2">
                                          <span>
                                            {regName(m.player_a_reg_id)}
                                          </span>
                                          <span className="tabular-nums">
                                            {m.score_a ?? "—"}
                                          </span>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                          <span>
                                            {regName(m.player_b_reg_id)}
                                          </span>
                                          <span className="tabular-nums">
                                            {m.score_b ?? "—"}
                                          </span>
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          {m.status}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              ))}
                            </div>
                          ) : (
                            rounds.map((round) => {
                              const roundMatches = list
                                .filter((m) => m.round === round)
                                .sort((a, b) => a.position - b.position);
                              return (
                                <div key={round} className="space-y-2">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    Round {round}
                                  </div>
                                  <div className="overflow-x-auto rounded-xl border border-border/60">
                                    <table className="w-full text-sm">
                                      <thead className="bg-background/60 text-left text-xs text-muted-foreground">
                                        <tr>
                                          <th className="px-3 py-2">#</th>
                                          <th className="px-3 py-2">A</th>
                                          <th className="px-3 py-2">B</th>
                                          <th className="px-3 py-2">Score</th>
                                          <th className="px-3 py-2">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {roundMatches.map((m) => (
                                          <tr
                                            key={m.id}
                                            className="border-t border-border/50"
                                          >
                                            <td className="px-3 py-2">
                                              {m.position}
                                            </td>
                                            <td className="px-3 py-2">
                                              {regName(m.player_a_reg_id)}
                                            </td>
                                            <td className="px-3 py-2">
                                              {regName(m.player_b_reg_id)}
                                            </td>
                                            <td className="px-3 py-2">
                                              {m.score_a != null &&
                                              m.score_b != null
                                                ? `${m.score_a}–${m.score_b}`
                                                : "—"}
                                            </td>
                                            <td className="px-3 py-2 capitalize">
                                              {m.status.replace("_", " ")}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="scoring" className="space-y-3">
          {matches.filter((m) => m.status === "scheduled").length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scheduled matches to score.
            </p>
          ) : (
            matches
              .filter((m) => m.status === "scheduled")
              .map((m) => (
                <Card key={m.id}>
                  <CardContent className="flex flex-wrap items-end gap-3 py-4">
                    <div className="min-w-[140px] flex-1">
                      <div className="text-sm font-medium">
                        {regName(m.player_a_reg_id)}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Score"
                        value={scores[m.id]?.a ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [m.id]: {
                              a: e.target.value,
                              b: prev[m.id]?.b ?? "",
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <div className="text-sm font-medium">
                        {regName(m.player_b_reg_id)}
                      </div>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Score"
                        value={scores[m.id]?.b ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [m.id]: {
                              a: prev[m.id]?.a ?? "",
                              b: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <Button
                      disabled={busy}
                      onClick={() => void handleScore(m.id)}
                    >
                      Record winner
                    </Button>
                  </CardContent>
                </Card>
              ))
          )}
          {matches.filter(
            (m) => m.status === "completed" || m.status === "bye"
          ).length > 0 && (
            <div className="space-y-2 pt-4">
              <h3 className="text-sm font-medium">Completed</h3>
              {matches
                .filter(
                  (m) => m.status === "completed" || m.status === "bye"
                )
                .map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-border/50 px-3 py-2 text-sm text-muted-foreground"
                  >
                    {regName(m.player_a_reg_id)} {m.score_a} – {m.score_b}{" "}
                    {regName(m.player_b_reg_id)}
                    {m.winner_reg_id
                      ? ` · W: ${regName(m.winner_reg_id)}`
                      : ""}
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="space-y-4">
          {tournament.format !== "round_robin" &&
          tournament.format !== "swiss" ? (
            <p className="text-sm text-muted-foreground">
              Standings apply to round robin and Swiss formats.
            </p>
          ) : (
            divisions.map((div) => {
              const rows = standings[div.id] ?? [];
              const topN = tournament.advance_count;
              const knockoutStarted = matches.some(
                (m) =>
                  m.division_id === div.id && m.bracket_type === "knockout"
              );
              return (
                <Card key={div.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">{div.name}</CardTitle>
                    {topN != null && (
                      <Button
                        size="sm"
                        disabled={busy || knockoutStarted}
                        onClick={() => void handleStartKnockout(div.id)}
                      >
                        {knockoutStarted
                          ? "Knockout started"
                          : `Start knockout (Top ${topN})`}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {rows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No standings yet — play pool/Swiss matches first.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="py-2 pr-2">#</th>
                              <th className="py-2 pr-2">Player</th>
                              <th className="py-2 pr-2">W</th>
                              <th className="py-2 pr-2">L</th>
                              <th className="py-2 pr-2">Diff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => {
                              const qualify = topN != null && row.rank <= topN;
                              return (
                                <tr
                                  key={row.registration_id}
                                  className={
                                    qualify
                                      ? "bg-primary/5 font-medium"
                                      : undefined
                                  }
                                >
                                  <td className="py-2 pr-2">{row.rank}</td>
                                  <td className="py-2 pr-2">
                                    {regName(row.registration_id)}
                                    {qualify ? " · qualifies" : ""}
                                  </td>
                                  <td className="py-2 pr-2">{row.wins}</td>
                                  <td className="py-2 pr-2">{row.losses}</td>
                                  <td className="py-2 pr-2">{row.point_diff}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add player</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Division</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 text-sm"
                value={addDivisionId}
                onChange={(e) => setAddDivisionId(e.target.value)}
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={addMode === "walkin" ? "default" : "outline"}
                onClick={() => setAddMode("walkin")}
              >
                Walk-in
              </Button>
              <Button
                size="sm"
                variant={addMode === "member" ? "default" : "outline"}
                onClick={() => setAddMode("member")}
              >
                Member
              </Button>
            </div>
            <Input
              placeholder="Search by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {addMode === "walkin"
                ? walkInHits.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => void handleAddPlayer({ walkInId: p.id })}
                    >
                      {p.full_name}
                    </button>
                  ))
                : memberHits.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() =>
                        void handleAddPlayer({ profileId: p.id })
                      }
                    >
                      {p.full_name ?? "Member"}
                    </button>
                  ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
