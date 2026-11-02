"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy,
  Plus,
  Users,
  CalendarDays,
  Coins,
  Swords,
  Network,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { BranchSelect } from "@/components/shared/branch-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TOURNAMENT_FORMATS,
  type SkillLevel,
  type TournamentFormat,
} from "@/lib/constants";
import { pesosToCents } from "@/lib/money";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FORMAT_META,
  SELECT_CLASS,
  STATUS_VARIANT,
  tournamentEntryPesos,
} from "@/lib/tournament-ui";
import { demoCreateTournament, getDemoTournaments, subscribeDemoTournaments } from "@/lib/demo-tournaments";
import { useAuthStore } from "@/store";
import { createTournament, listTournaments, type TournamentRow } from "@/services/tournaments";

type CreateForm = {
  name: string;
  format: TournamentFormat;
  startsAt: string;
  endsAt: string;
  maxPlayers: string;
  advanceCount: string;
  consolation: boolean;
  swissRounds: string;
  skillLevels: SkillLevel[];
  skillFees: Record<SkillLevel, string>;
};

function toLocalDateValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → ISO at local start/end of day */
function dateOnlyToIso(value: string, endOfDay: boolean) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return dt.toISOString();
}

function emptyForm(): CreateForm {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    name: "",
    format: "single_elimination",
    startsAt: toLocalDateValue(start),
    endsAt: toLocalDateValue(end),
    maxPlayers: "16",
    advanceCount: "",
    consolation: false,
    swissRounds: "5",
    skillLevels: ["intermediate"],
    skillFees: {
      beginner: "0",
      novice: "0",
      intermediate: "0",
      advanced: "0",
      professional: "0",
    },
  };
}

export default function TournamentsPage() {
  const { isDemoMode, branch } = useAuthStore();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>(emptyForm);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (isDemoMode) {
        if (!cancelled) {
          setTournaments(getDemoTournaments(branch?.id));
          setLoading(false);
        }
        return;
      }
      if (!branch?.id) {
        if (!cancelled) {
          setTournaments([]);
          setLoading(false);
        }
        return;
      }
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const rows = await listTournaments(supabase, branch.id);
        if (!cancelled) setTournaments(rows);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load tournaments";
        toast.error(message);
        if (!cancelled) setTournaments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, branch?.id]);

  useEffect(() => {
    if (!isDemoMode) return;
    return subscribeDemoTournaments(() => {
      setTournaments(getDemoTournaments(branch?.id));
    });
  }, [isDemoMode, branch?.id]);

  const activeCount = useMemo(
    () =>
      tournaments.filter(
        (t) =>
          t.status === "ongoing" ||
          t.status === "registration" ||
          t.status === "seeding"
      ).length,
    [tournaments]
  );

  const liveTournament = useMemo(
    () => tournaments.find((t) => t.status === "ongoing") ?? tournaments[0],
    [tournaments]
  );

  function toggleSkill(level: SkillLevel) {
    setForm((f) => {
      const has = f.skillLevels.includes(level);
      return {
        ...f,
        skillLevels: has
          ? f.skillLevels.filter((s) => s !== level)
          : [...f.skillLevels, level],
      };
    });
  }

  function setSkillFee(level: SkillLevel, value: string) {
    setForm((f) => ({
      ...f,
      skillFees: { ...f.skillFees, [level]: value },
    }));
  }

  async function handleCreate() {
    if (!branch?.id) {
      toast.error("Select a branch first");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (form.skillLevels.length === 0) {
      toast.error("Select at least one skill division");
      return;
    }

    const advanceRaw = form.advanceCount.trim();
    const advanceCount =
      advanceRaw === "" ? null : Number.parseInt(advanceRaw, 10);
    if (advanceRaw !== "" && (!Number.isFinite(advanceCount) || (advanceCount ?? 0) < 1)) {
      toast.error("Advance count must be a positive number");
      return;
    }

    setSaving(true);
    const skillEntryFees = Object.fromEntries(
      form.skillLevels.map((level) => [
        level,
        pesosToCents(form.skillFees[level] || "0"),
      ])
    ) as Partial<Record<SkillLevel, number>>;
    const feeValues = Object.values(skillEntryFees);
    const entryFeeCents =
      feeValues.length > 0 ? Math.min(...feeValues) : 0;

    const input = {
      branchId: branch.id,
      name: form.name.trim(),
      format: form.format,
      startsAt: dateOnlyToIso(form.startsAt, false),
      endsAt: dateOnlyToIso(form.endsAt, true),
      maxPlayers: Number.parseInt(form.maxPlayers, 10) || 16,
      entryFeeCents,
      skillEntryFees,
      advanceCount,
      consolationEnabled: form.consolation,
      swissRounds:
        form.format === "swiss"
          ? Number.parseInt(form.swissRounds, 10) || 5
          : 5,
      skillLevels: form.skillLevels,
    };

    try {
      if (isDemoMode) {
        demoCreateTournament(input);
      } else {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await createTournament(supabase, input);
        const rows = await listTournaments(supabase, branch.id);
        setTournaments(rows);
      }
      toast.success("Tournament created");
      setDialogOpen(false);
      setForm(emptyForm());
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create tournament";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Tournaments"
        description="Organize brackets, manage registration, and run live tournament day operations."
        actions={
          <>
            <BranchSelect id="tournaments-branch" />
            <Button
              onClick={() => {
                setForm(emptyForm());
                setDialogOpen(true);
              }}
              disabled={!branch?.id}
            >
              <Plus className="h-4 w-4" />
              Create Tournament
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(FORMAT_META) as TournamentFormat[]).map((format, i) => {
          const meta = FORMAT_META[format];
          const Icon = meta.icon;
          return (
            <motion.div
              key={format}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card>
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-semibold">{meta.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                All Tournaments
              </CardTitle>
              <Badge variant="secondary">{activeCount} active</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading tournaments…
                </div>
              ) : tournaments.length === 0 ? (
                <EmptyState
                  icon={<Trophy className="h-6 w-6" />}
                  title="No tournaments yet"
                  description="Create your first tournament to start registrations."
                  action={
                    <Button
                      onClick={() => {
                        setForm(emptyForm());
                        setDialogOpen(true);
                      }}
                      disabled={!branch?.id}
                    >
                      <Plus className="h-4 w-4" />
                      Create Tournament
                    </Button>
                  }
                />
              ) : (
                tournaments.map((t, i) => {
                  const meta = FORMAT_META[t.format] ?? FORMAT_META.single_elimination;
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      className="flex flex-col gap-4 rounded-2xl bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{t.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {meta.label} · Max {t.max_players} players
                          </p>
                          {t.description ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 sm:justify-end">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t.starts_at ? formatDate(t.starts_at) : "TBD"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Coins className="h-3.5 w-3.5" />
                          {formatCurrency(tournamentEntryPesos(t))}
                        </div>
                        <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>
                          {t.status.replace("_", " ")}
                        </Badge>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/tournaments/${t.id}`}>Manage</Link>
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" />
              Live Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveTournament ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-12 text-center">
                <Network className="h-8 w-8 text-primary/70" />
                <p className="text-sm font-medium">{liveTournament.name}</p>
                <p className="max-w-[220px] text-xs text-muted-foreground">
                  Open the tournament to view brackets, score matches, and manage the roster.
                </p>
                <Button variant="soft" size="sm" className="mt-1" asChild>
                  <Link href={`/tournaments/${liveTournament.id}`}>
                    Open bracket
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-12 text-center">
                <Network className="h-8 w-8 text-primary/70" />
                <p className="text-sm font-medium">No live bracket running</p>
                <p className="max-w-[220px] text-xs text-muted-foreground">
                  Start a tournament to unlock the real-time bracket viewer with live score sync.
                </p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/50 p-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Registered players sync every 10s
              </span>
              <Badge variant="success" className="animate-pulse">
                Live
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create tournament</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Summer Smash Open"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="t-format">Format</Label>
              <select
                id="t-format"
                className={SELECT_CLASS}
                value={form.format}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    format: e.target.value as TournamentFormat,
                  }))
                }
              >
                {TOURNAMENT_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {FORMAT_META[format].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-starts">Start date</Label>
              <Input
                id="t-starts"
                type="date"
                value={form.startsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startsAt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-ends">End date</Label>
              <Input
                id="t-ends"
                type="date"
                value={form.endsAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endsAt: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-max">Max players</Label>
              <Input
                id="t-max"
                type="number"
                min={2}
                value={form.maxPlayers}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxPlayers: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-advance">Advance count</Label>
              <Input
                id="t-advance"
                type="number"
                min={1}
                placeholder="Optional"
                value={form.advanceCount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, advanceCount: e.target.value }))
                }
              />
            </div>
            {form.format === "swiss" ? (
              <div className="space-y-1.5">
                <Label htmlFor="t-swiss">Swiss rounds</Label>
                <Input
                  id="t-swiss"
                  type="number"
                  min={1}
                  value={form.swissRounds}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, swissRounds: e.target.value }))
                  }
                />
              </div>
            ) : (
              <div />
            )}
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
              <div>
                <Label htmlFor="t-consolation">Consolation bracket</Label>
                <p className="text-xs text-muted-foreground">
                  Extra matches for early-round losers
                </p>
              </div>
              <Switch
                id="t-consolation"
                checked={form.consolation}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, consolation: checked }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Skill divisions & entry fees</Label>
              <div className="grid gap-2">
                {SKILL_LEVELS.map((level) => {
                  const checked = form.skillLevels.includes(level);
                  return (
                    <div
                      key={level}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <label className="flex min-w-[140px] cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={checked}
                          onChange={() => toggleSkill(level)}
                        />
                        {SKILL_LEVEL_LABELS[level]}
                      </label>
                      <div className="ml-auto flex items-center gap-2">
                        <Label
                          htmlFor={`fee-${level}`}
                          className="text-xs text-muted-foreground"
                        >
                          Fee ₱
                        </Label>
                        <Input
                          id={`fee-${level}`}
                          className="h-8 w-24"
                          type="number"
                          min={0}
                          disabled={!checked}
                          value={form.skillFees[level]}
                          onChange={(e) =>
                            setSkillFee(level, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
