"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_BRANCH_SERVICES, DEMO_COURTS } from "@/lib/demo-data";
import { centsToPesosInput, pesosToCents } from "@/lib/money";
import { listCourts } from "@/services/courts";
import {
  getBranchFeeDefaults,
  listBranchServices,
  updateBranchService,
  updateCourtHourlyRate,
  upsertBranchFeeDefaults,
  type BranchService,
} from "@/services/branch-services";
import { useAuthStore } from "@/store";
import type { Court } from "@/types";

export function BranchPricingPanel() {
  const uid = useId();
  const { branch, isDemoMode } = useAuthStore();
  const branchId = branch?.id;

  const [loading, setLoading] = useState(true);
  const [savingFees, setSavingFees] = useState(false);
  const [savingCourts, setSavingCourts] = useState(false);
  const [services, setServices] = useState<BranchService[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [fees, setFees] = useState({
    openPlay: "0",
    exclusive: "0",
    walkInOpenPlay: "0",
    walkInExclusive: "0",
  });
  const [courtRates, setCourtRates] = useState<Record<string, string>>({});

  async function load() {
    if (!branchId) {
      setServices([]);
      setCourts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isDemoMode) {
      const demoServices = DEMO_BRANCH_SERVICES.filter((s) => s.branch_id === branchId);
      setServices(demoServices);
      const demoCourts = DEMO_COURTS.filter((c) => c.branch_id === branchId);
      setCourts(demoCourts);
      const openPlay =
        demoServices.find((s) => s.service_type === "open_play" && s.is_default)?.price_cents ??
        15000;
      const rental =
        demoServices.find((s) => s.service_type === "court_rental" && s.is_default)?.price_cents ??
        60000;
      setFees({
        openPlay: centsToPesosInput(openPlay),
        exclusive: centsToPesosInput(rental),
        walkInOpenPlay: centsToPesosInput(openPlay),
        walkInExclusive: centsToPesosInput(rental),
      });
      setCourtRates(
        Object.fromEntries(
          demoCourts.map((c) => [c.id, String(c.hourly_rate)])
        )
      );
      setLoading(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const [svcRows, courtRows, feeRow] = await Promise.all([
        listBranchServices(supabase, branchId),
        listCourts(supabase, branchId),
        getBranchFeeDefaults(supabase, branchId),
      ]);
      setServices(svcRows);
      setCourts(courtRows);
      setFees({
        openPlay: centsToPesosInput(feeRow.default_open_play_fee_cents),
        exclusive: centsToPesosInput(feeRow.exclusive_court_fee_cents),
        walkInOpenPlay: centsToPesosInput(feeRow.walk_in_open_play_fee_cents),
        walkInExclusive: centsToPesosInput(feeRow.walk_in_exclusive_fee_cents),
      });
      setCourtRates(
        Object.fromEntries(courtRows.map((c) => [c.id, String(c.hourly_rate)]))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load pricing";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on branch / demo toggle
  }, [branchId, isDemoMode]);

  async function saveFeeDefaults() {
    if (!branchId) return;
    setSavingFees(true);

    const payload = {
      default_open_play_fee_cents: pesosToCents(fees.openPlay),
      walk_in_open_play_fee_cents: pesosToCents(fees.walkInOpenPlay),
      exclusive_court_fee_cents: pesosToCents(fees.exclusive),
      walk_in_exclusive_fee_cents: pesosToCents(fees.walkInExclusive),
    };

    if (isDemoMode) {
      setServices((prev) =>
        prev.map((s) => {
          if (s.service_type === "open_play" && s.is_default) {
            return { ...s, price_cents: payload.default_open_play_fee_cents };
          }
          if (s.service_type === "court_rental" && s.is_default) {
            return { ...s, price_cents: payload.exclusive_court_fee_cents };
          }
          return s;
        })
      );
      toast.success("Fee defaults saved");
      setSavingFees(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await upsertBranchFeeDefaults(supabase, branchId, payload);

      const openDefault = services.find(
        (s) => s.service_type === "open_play" && s.is_default
      );
      const rentalDefault = services.find(
        (s) => s.service_type === "court_rental" && s.is_default
      );
      if (openDefault) {
        await updateBranchService(supabase, openDefault.id, {
          price_cents: payload.default_open_play_fee_cents,
        });
      }
      if (rentalDefault) {
        await updateBranchService(supabase, rentalDefault.id, {
          price_cents: payload.exclusive_court_fee_cents,
        });
      }

      toast.success("Fee defaults saved");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save fees";
      toast.error(message);
    } finally {
      setSavingFees(false);
    }
  }

  async function saveCourtRates() {
    if (!branchId) return;
    setSavingCourts(true);

    if (isDemoMode) {
      setCourts((prev) =>
        prev.map((c) => ({
          ...c,
          hourly_rate: Number(courtRates[c.id] ?? c.hourly_rate) || 0,
        }))
      );
      toast.success("Court rates saved");
      setSavingCourts(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await Promise.all(
        courts.map((c) =>
          updateCourtHourlyRate(
            supabase,
            c.id,
            pesosToCents(courtRates[c.id] ?? String(c.hourly_rate))
          )
        )
      );
      toast.success("Court rates saved");
      await load();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save court rates";
      toast.error(message);
    } finally {
      setSavingCourts(false);
    }
  }

  if (!branchId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a branch using the dropdown in the page header to edit pricing.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading pricing…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Branch fee defaults</CardTitle>
          <CardDescription>
            Open play is charged per session. Exclusive court rental is per hour.
            Amounts are in pesos and stored as cents. Saving also updates matching
            catalog defaults when they exist.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-fee-open-play`}>Open play fee (₱)</Label>
              <Input
                id={`${uid}-fee-open-play`}
                type="number"
                min={0}
                step="any"
                value={fees.openPlay}
                onChange={(e) =>
                  setFees((f) => ({ ...f, openPlay: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-fee-walk-open`}>Walk-in open play (₱)</Label>
              <Input
                id={`${uid}-fee-walk-open`}
                type="number"
                min={0}
                step="any"
                value={fees.walkInOpenPlay}
                onChange={(e) =>
                  setFees((f) => ({ ...f, walkInOpenPlay: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-fee-exclusive`}>Exclusive court / hour (₱)</Label>
              <Input
                id={`${uid}-fee-exclusive`}
                type="number"
                min={0}
                step="any"
                value={fees.exclusive}
                onChange={(e) =>
                  setFees((f) => ({ ...f, exclusive: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${uid}-fee-walk-exclusive`}>
                Walk-in exclusive / hour (₱)
              </Label>
              <Input
                id={`${uid}-fee-walk-exclusive`}
                type="number"
                min={0}
                step="any"
                value={fees.walkInExclusive}
                onChange={(e) =>
                  setFees((f) => ({ ...f, walkInExclusive: e.target.value }))
                }
              />
            </div>
          </div>
          <Button
            onClick={() => void saveFeeDefaults()}
            disabled={savingFees || savingCourts}
          >
            {savingFees && <Loader2 className="h-4 w-4 animate-spin" />}
            Save fee defaults
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Court hourly rates</CardTitle>
          <CardDescription>
            Per-court exclusive hourly rate. When set above 0, booking fees use
            court rate × duration hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No courts for this branch.{" "}
              <Link
                href="/courts"
                className="text-primary underline-offset-4 hover:underline"
              >
                Manage courts
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {courts.map((court) => (
                <div
                  key={court.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{court.name}</p>
                    <p className="text-xs text-muted-foreground">{court.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${uid}-rate-${court.id}`} className="sr-only">
                      Hourly rate for {court.name}
                    </Label>
                    <Input
                      id={`${uid}-rate-${court.id}`}
                      type="number"
                      min={0}
                      step="any"
                      className="w-32"
                      value={courtRates[court.id] ?? "0"}
                      onChange={(e) =>
                        setCourtRates((prev) => ({
                          ...prev,
                          [court.id]: e.target.value,
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">₱/hr</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            onClick={() => void saveCourtRates()}
            disabled={savingFees || savingCourts || courts.length === 0}
          >
            {savingCourts && <Loader2 className="h-4 w-4 animate-spin" />}
            Save court rates
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
