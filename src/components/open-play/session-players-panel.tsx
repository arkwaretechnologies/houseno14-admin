"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import {
  getDemoPlayers,
  setDemoPlayers,
  subscribeDemoPlayers,
} from "@/lib/demo-players";
import { SKILL_LEVEL_LABELS, type SkillLevel } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { listMembers } from "@/services/members";
import {
  addMemberRegistration,
  cancelRegistration,
  checkInRegistration,
  listSessionRegistrations,
  payRegistration,
  type OpenPlayRegistrationRow,
  type RegistrationStatus,
} from "@/services/registrations";
import { addPlayerToSchedule } from "@/services/players";
import { PlayerManager } from "@/components/open-play/player-manager";
import {
  OpenPlayPaymentDialog,
  type OpenPlayPaymentResult,
} from "@/components/open-play/open-play-payment-dialog";
import type { Member, OpenPlayPlayer } from "@/types";
import type { OpenPlaySessionRow } from "@/services/sessions";

const DEMO_OPEN_PLAY_FEE_CENTS = 15000;

const REG_STATUS_VARIANT: Record<
  RegistrationStatus,
  "secondary" | "success" | "destructive"
> = {
  registered: "secondary",
  checked_in: "success",
  cancelled: "destructive",
};

const CHECK_IN_EARLY_MS = 10 * 60 * 1000;

function canCheckIn(session: OpenPlaySessionRow) {
  const now = Date.now();
  const start = new Date(session.starts_at).getTime();
  const end = new Date(session.ends_at).getTime();
  return (
    (session.status === "open" || session.status === "scheduled") &&
    start - CHECK_IN_EARLY_MS <= now &&
    now < end
  );
}

function withPaymentDefaults(
  row: Omit<
    OpenPlayRegistrationRow,
    | "fee_cents"
    | "paid"
    | "payment_method"
    | "amount_tendered_cents"
    | "change_cents"
    | "paid_at"
  > &
    Partial<
      Pick<
        OpenPlayRegistrationRow,
        | "fee_cents"
        | "paid"
        | "payment_method"
        | "amount_tendered_cents"
        | "change_cents"
        | "paid_at"
      >
    >
): OpenPlayRegistrationRow {
  const fee = row.fee_cents ?? DEMO_OPEN_PLAY_FEE_CENTS;
  const paid = row.paid ?? fee === 0;
  return {
    ...row,
    fee_cents: fee,
    paid,
    payment_method: row.payment_method ?? null,
    amount_tendered_cents: row.amount_tendered_cents ?? null,
    change_cents: row.change_cents ?? null,
    paid_at: row.paid_at ?? (paid ? new Date().toISOString() : null),
  };
}

export function SessionPlayersPanel({
  session,
  onClose,
  onChanged,
}: {
  session: OpenPlaySessionRow;
  onClose?: () => void;
  /** Fired after roster/check-in/payment changes so Queue can refresh the live board. */
  onChanged?: () => void | Promise<void>;
}) {
  const { isDemoMode, branch } = useAuthStore();
  const [rows, setRows] = useState<OpenPlayRegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payingRow, setPayingRow] = useState<OpenPlayRegistrationRow | null>(
    null
  );
  const [confirmingPay, setConfirmingPay] = useState(false);

  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [demoPlayers, setDemoPlayersState] = useState<OpenPlayPlayer[]>(() =>
    getDemoPlayers()
  );

  useEffect(() => subscribeDemoPlayers(() => setDemoPlayersState(getDemoPlayers())), []);

  async function loadLive() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const data = await listSessionRegistrations(supabase, session.id);
    setRows(data);
  }

  async function notifyChanged() {
    if (!onChanged) return;
    try {
      await onChanged();
    } catch {
      // Parent handles its own errors.
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (isDemoMode) {
        if (!cancelled) {
          setRows([]);
          setLoading(false);
        }
        return;
      }
      try {
        await loadLive();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load players";
        toast.error(message);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, isDemoMode]);

  useEffect(() => {
    let cancelled = false;
    const q = memberQuery.trim();

    async function search() {
      if (q.length < 1) {
        setMemberResults([]);
        return;
      }
      setSearchingMembers(true);
      try {
        if (isDemoMode) {
          const filtered = DEMO_MEMBERS.filter((m) =>
            m.full_name.toLowerCase().includes(q.toLowerCase())
          ).slice(0, 8);
          if (!cancelled) setMemberResults(filtered);
          return;
        }
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const result = await listMembers(supabase, {
          branchId: branch?.id,
          search: q,
          pageSize: 8,
        });
        if (!cancelled) setMemberResults(result.data);
      } catch {
        if (!cancelled) setMemberResults([]);
      } finally {
        if (!cancelled) setSearchingMembers(false);
      }
    }

    const t = window.setTimeout(() => void search(), 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [memberQuery, isDemoMode, branch?.id]);

  const activeRows = useMemo(
    () => rows.filter((r) => r.status !== "cancelled"),
    [rows]
  );

  const excludedPlayerIds = useMemo(
    () =>
      activeRows
        .map((r) => r.walk_in_id)
        .filter((id): id is string => Boolean(id)),
    [activeRows]
  );

  const addMember = async (member: Member) => {
    setBusyId(member.id);
    try {
      if (isDemoMode) {
        if (
          rows.some(
            (r) => r.profile_id === member.id && r.status !== "cancelled"
          )
        ) {
          toast.error("Member already on this session roster");
          return;
        }
        const row = withPaymentDefaults({
          id: `reg-demo-${Date.now()}`,
          session_id: session.id,
          profile_id: member.id,
          walk_in_id: null,
          full_name: member.full_name,
          gender: (member.gender as "male" | "female" | null) ?? null,
          skill_level: null,
          status: "registered",
          checked_in_at: null,
          queue_id: null,
          created_at: new Date().toISOString(),
          created_by: null,
          profile: { id: member.id, full_name: member.full_name },
          walk_in: null,
        });
        setRows((prev) => [...prev, row]);
        setMemberQuery("");
        setMemberResults([]);
        toast.success(`${member.full_name} added to roster`);
        await notifyChanged();
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await addMemberRegistration(supabase, {
        sessionId: session.id,
        profileId: member.id,
        gender: (member.gender as "male" | "female" | null) ?? null,
      });
      await loadLive();
      setMemberQuery("");
      setMemberResults([]);
      toast.success(`${member.full_name} added to roster`);
      await notifyChanged();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add member";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const addPlayer = async (player: OpenPlayPlayer) => {
    try {
      if (
        rows.some(
          (r) =>
            r.walk_in_id === player.id &&
            (r.status === "registered" || r.status === "checked_in")
        )
      ) {
        toast.error("Player already on this session roster");
        return;
      }

      if (isDemoMode) {
        const row = withPaymentDefaults({
          id: `reg-demo-player-${Date.now()}`,
          session_id: session.id,
          profile_id: null,
          walk_in_id: player.id,
          full_name: player.full_name,
          gender: player.gender,
          skill_level: player.skill_level as SkillLevel,
          status: "registered",
          checked_in_at: null,
          queue_id: null,
          created_at: new Date().toISOString(),
          created_by: null,
          profile: null,
          walk_in: { id: player.id, full_name: player.full_name },
        });
        setRows((prev) => [...prev, row]);
        toast.success(`${player.full_name} added to roster`);
        await notifyChanged();
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await addPlayerToSchedule(supabase, session.id, player.id);
      await loadLive();
      toast.success(`${player.full_name} added to roster`);
      await notifyChanged();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" &&
              err &&
              "message" in err &&
              typeof (err as { message: unknown }).message === "string"
            ? (err as { message: string }).message
            : "Failed to add player";
      toast.error(message);
    }
  };

  const removeRow = async (row: OpenPlayRegistrationRow) => {
    setBusyId(row.id);
    try {
      if (isDemoMode) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, status: "cancelled" } : r
          )
        );
        toast.success("Removed from roster");
        await notifyChanged();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await cancelRegistration(supabase, row.id);
      await loadLive();
      toast.success("Removed from roster");
      await notifyChanged();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove player";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const checkIn = async (row: OpenPlayRegistrationRow) => {
    if (!row.paid) {
      toast.error("Player must pay before check-in");
      return;
    }
    if (!canCheckIn(session)) {
      toast.error("Check-in opens 10 minutes before the session starts");
      return;
    }
    setBusyId(row.id);
    try {
      if (isDemoMode) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: "checked_in",
                  checked_in_at: new Date().toISOString(),
                  queue_id: `q-${Date.now()}`,
                }
              : r
          )
        );
        toast.success(`${row.full_name} checked in`);
        await notifyChanged();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await checkInRegistration(supabase, row.id);
      await loadLive();
      toast.success(`${row.full_name} checked in`);
      await notifyChanged();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check in";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const collectPayment = async (result: OpenPlayPaymentResult) => {
    if (!payingRow) return;
    setConfirmingPay(true);
    try {
      if (isDemoMode) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === payingRow.id
              ? {
                  ...r,
                  paid: true,
                  paid_at: new Date().toISOString(),
                  payment_method: result.method,
                  amount_tendered_cents: result.amountTenderedCents ?? null,
                  change_cents: result.changeCents ?? null,
                }
              : r
          )
        );
        toast.success(`${payingRow.full_name} marked paid`);
        setPayingRow(null);
        await notifyChanged();
        return;
      }
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await payRegistration(supabase, payingRow.id, {
        paymentMethod: result.method,
        amountTenderedCents: result.amountTenderedCents ?? null,
      });
      await loadLive();
      toast.success(`${payingRow.full_name} marked paid`);
      setPayingRow(null);
      await notifyChanged();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to collect payment";
      toast.error(message);
    } finally {
      setConfirmingPay(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Session players
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.status} · max {session.max_players} · {activeRows.length}{" "}
            on roster
            {!canCheckIn(session)
              ? " · check-in opens 10 minutes before start"
              : " · check-in available"}
          </p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="member-search">Add member</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="member-search"
              className="pl-9"
              placeholder="Search members…"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
          </div>
          {searchingMembers ? (
            <p className="text-xs text-muted-foreground">Searching…</p>
          ) : null}
          {memberResults.length > 0 ? (
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {memberResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={busyId === m.id}
                  onClick={() => void addMember(m)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate font-medium">{m.full_name}</span>
                  <span className="text-xs text-muted-foreground">Add</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <PlayerManager
          branchId={branch?.id}
          isDemoMode={isDemoMode}
          demoPlayers={demoPlayers}
          onDemoPlayersChange={(next) => {
            setDemoPlayers(next);
            setDemoPlayersState(next);
          }}
          actionLabel="Add to schedule"
          onSelectPlayer={addPlayer}
          excludedPlayerIds={excludedPlayerIds}
          excludedActionLabel="On schedule"
        />

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading players…
          </div>
        ) : activeRows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            No players on this schedule yet. Add members or players above.
          </p>
        ) : (
          <div className="space-y-2">
            {activeRows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{row.full_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {row.profile_id ? "Member" : "Player"}
                    </Badge>
                    <Badge variant={REG_STATUS_VARIANT[row.status]}>
                      {row.status.replace("_", " ")}
                    </Badge>
                    <Badge variant={row.paid ? "success" : "warning"}>
                      {row.paid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.gender ?? "—"}
                    {row.skill_level
                      ? ` · ${SKILL_LEVEL_LABELS[row.skill_level as SkillLevel] ?? row.skill_level}`
                      : ""}
                    {` · ${formatCurrency((row.fee_cents ?? 0) / 100)}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.status === "registered" ? (
                    <>
                      {!row.paid ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === row.id}
                          onClick={() => setPayingRow(row)}
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          Collect payment
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="default"
                        disabled={
                          busyId === row.id ||
                          !row.paid ||
                          !canCheckIn(session)
                        }
                        title={
                          !row.paid
                            ? "Player must pay before check-in"
                            : !canCheckIn(session)
                              ? "Check-in opens 10 minutes before start"
                              : undefined
                        }
                        onClick={() => void checkIn(row)}
                      >
                        {busyId === row.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Check in
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => void removeRow(row)}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      In queue
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <OpenPlayPaymentDialog
        open={!!payingRow}
        onOpenChange={(open) => {
          if (!open) setPayingRow(null);
        }}
        playerName={payingRow?.full_name ?? ""}
        feeCents={payingRow?.fee_cents ?? 0}
        confirming={confirmingPay}
        onConfirm={collectPayment}
      />
    </Card>
  );
}
