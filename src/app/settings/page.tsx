"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Clock,
  CreditCard,
  Banknote,
  ListOrdered,
  Swords,
  Palette,
  Save,
  Upload,
  Loader2,
  MapPin,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { BranchSelect } from "@/components/shared/branch-select";
import { BranchPricingPanel } from "@/components/settings/branch-pricing-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/shared/brand-mark";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMO_BRANCHES, DEMO_COURTS } from "@/lib/demo-data";
import { updateBranch } from "@/services/branches";
import {
  deleteCourt,
  listCourts,
  updateCourtMode,
  type CourtMode,
} from "@/services/courts";
import { useAuthStore } from "@/store";
import type { Branch, Court } from "@/types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function SaveButton({ label = "Save Changes" }: { label?: string }) {
  return (
    <Button
      onClick={() =>
        toast.success("Settings saved", { description: `${label} updated successfully.` })
      }
    >
      <Save className="h-4 w-4" />
      {label}
    </Button>
  );
}

type BusinessForm = {
  name: string;
  code: string;
  phone: string;
  email: string;
  address: string;
};

function branchToForm(branch: Branch): BusinessForm {
  return {
    name: branch.name,
    code: branch.code,
    phone: branch.phone ?? "",
    email: branch.email ?? "",
    address: branch.address ?? "",
  };
}

function courtModeFromCourt(court: Court): CourtMode {
  return court.is_exclusive ? "exclusive" : "open_play";
}

function courtModesFromCourts(courts: Court[]): Record<string, CourtMode> {
  return Object.fromEntries(
    courts.map((c) => [c.id, courtModeFromCourt(c)])
  );
}

export default function SettingsPage() {
  const { branch, setBranch, isDemoMode } = useAuthStore();
  const [businessForm, setBusinessForm] = useState<BusinessForm>({
    name: "",
    code: "",
    phone: "",
    email: "",
    address: "",
  });
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
    if (branch) {
      setBusinessForm(branchToForm(branch));
    } else {
      setBusinessForm({ name: "", code: "", phone: "", email: "", address: "" });
    }
  }, [branch?.id, branch?.updated_at]);

  const handleSaveBusinessInfo = async () => {
    if (!branch) {
      toast.error("Select a branch first");
      return;
    }
    if (!businessForm.name.trim() || !businessForm.code.trim()) {
      toast.error("Business name and branch code are required");
      return;
    }

    setSavingBusiness(true);
    try {
      const payload = {
        name: businessForm.name,
        code: businessForm.code,
        phone: businessForm.phone || null,
        email: businessForm.email || null,
        address: businessForm.address || null,
      };

      if (isDemoMode) {
        const updated: Branch = {
          ...branch,
          ...payload,
          updated_at: new Date().toISOString(),
        };
        const demoEntry = DEMO_BRANCHES.find((b) => b.id === branch.id);
        if (demoEntry) {
          Object.assign(demoEntry, updated);
        }
        setBranch(updated);
        toast.success("Business info saved");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const updated = await updateBranch(supabase, branch.id, payload);
      setBranch(updated);
      toast.success("Business info saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save business info";
      toast.error(message);
    } finally {
      setSavingBusiness(false);
    }
  };

  const [hours, setHours] = useState(
    DAYS.map((day, i) => ({
      day,
      open: i === 6 ? "07:00" : "06:00",
      close: i === 4 || i === 5 ? "24:00" : "23:00",
      closed: false,
    }))
  );

  const [payments, setPayments] = useState({
    cash: true,
    gcash: true,
    maya: true,
    qrph: false,
    card: false,
  });

  const [queueRules, setQueueRules] = useState({
    playersPerMatch: 4,
    autoAssignCourt: true,
    notifyPlayers: true,
    maxWaitMinutes: 45,
  });

  const [matchRules, setMatchRules] = useState({
    pointsToWin: 11,
    winByTwo: true,
    bestOf: 3,
    allowDraws: false,
  });

  const [branding, setBranding] = useState({
    primaryColor: "#16a34a",
    accentColor: "#22c55e",
  });

  const [branchCourts, setBranchCourts] = useState<Court[]>([]);
  const [courtModes, setCourtModes] = useState<Record<string, CourtMode>>({});
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [savingCourts, setSavingCourts] = useState(false);
  const [courtToDelete, setCourtToDelete] = useState<Court | null>(null);
  const [deletingCourt, setDeletingCourt] = useState(false);

  useEffect(() => {
    if (!branch?.id) {
      setBranchCourts([]);
      setCourtModes({});
      return;
    }

    let cancelled = false;

    async function loadCourts() {
      setLoadingCourts(true);
      try {
        if (isDemoMode) {
          const rows = DEMO_COURTS.filter((c) => c.branch_id === branch!.id);
          if (!cancelled) {
            setBranchCourts(rows);
            setCourtModes(courtModesFromCourts(rows));
          }
          return;
        }

        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const rows = await listCourts(supabase, branch!.id);
        if (!cancelled) {
          setBranchCourts(rows);
          setCourtModes(courtModesFromCourts(rows));
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load courts";
          toast.error(message);
          setBranchCourts([]);
          setCourtModes({});
        }
      } finally {
        if (!cancelled) setLoadingCourts(false);
      }
    }

    void loadCourts();
    return () => {
      cancelled = true;
    };
  }, [branch?.id, isDemoMode]);

  const handleSaveCourtModes = async () => {
    if (!branch) {
      toast.error("Select a branch first");
      return;
    }

    const changes = branchCourts.filter(
      (c) => courtModes[c.id] !== courtModeFromCourt(c)
    );
    if (changes.length === 0) {
      toast.message("No changes to save");
      return;
    }

    setSavingCourts(true);
    try {
      if (isDemoMode) {
        for (const court of changes) {
          const mode = courtModes[court.id];
          const demoEntry = DEMO_COURTS.find((c) => c.id === court.id);
          if (demoEntry) {
            demoEntry.is_open_play = mode === "open_play";
            demoEntry.is_exclusive = mode === "exclusive";
            demoEntry.updated_at = new Date().toISOString();
          }
        }
        const rows = DEMO_COURTS.filter((c) => c.branch_id === branch.id);
        setBranchCourts(rows);
        setCourtModes(courtModesFromCourts(rows));
        toast.success("Court settings saved");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Session expired. Sign in again to save court settings.");
        return;
      }
      await Promise.all(
        changes.map((c) =>
          updateCourtMode(supabase, c.id, courtModes[c.id])
        )
      );
      const rows = await listCourts(supabase, branch.id);
      setBranchCourts(rows);
      setCourtModes(courtModesFromCourts(rows));
      toast.success("Court settings saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save court settings";
      toast.error(message);
    } finally {
      setSavingCourts(false);
    }
  };

  const handleConfirmDeleteCourt = async () => {
    if (!branch || !courtToDelete) return;

    setDeletingCourt(true);
    try {
      if (isDemoMode) {
        const idx = DEMO_COURTS.findIndex((c) => c.id === courtToDelete.id);
        if (idx >= 0) DEMO_COURTS.splice(idx, 1);
        const rows = DEMO_COURTS.filter((c) => c.branch_id === branch.id);
        setBranchCourts(rows);
        setCourtModes(courtModesFromCourts(rows));
        toast.success("Court deleted");
        setCourtToDelete(null);
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await deleteCourt(supabase, courtToDelete.id);
      const rows = await listCourts(supabase, branch.id);
      setBranchCourts(rows);
      setCourtModes(courtModesFromCourts(rows));
      toast.success("Court deleted");
      setCourtToDelete(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete court";
      toast.error(message);
    } finally {
      setDeletingCourt(false);
    }
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Settings"
        description="Configure business details, operations, pricing, and branding for your club."
        actions={<BranchSelect id="settings-branch" />}
      />

      <Tabs defaultValue="business">
        <TabsList className="mb-2 flex h-auto flex-wrap justify-start gap-1 p-1.5">
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="hours">Operating Hours</TabsTrigger>
          <TabsTrigger value="payments">Payment Methods</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="courts">Courts</TabsTrigger>
          <TabsTrigger value="queue">Queue Rules</TabsTrigger>
          <TabsTrigger value="match">Match Rules</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Business Information
              </CardTitle>
              <CardDescription>
                Edits the branch selected above (e.g. Bayog). Shown on receipts and member
                communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!branch ? (
                <p className="text-sm text-muted-foreground">
                  Select a branch using the dropdown in the page header to edit its details.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="biz-name">Business Name</Label>
                      <Input
                        id="biz-name"
                        value={businessForm.name}
                        onChange={(e) =>
                          setBusinessForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="biz-code">Branch Code</Label>
                      <Input
                        id="biz-code"
                        value={businessForm.code}
                        onChange={(e) =>
                          setBusinessForm((f) => ({ ...f, code: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="biz-phone">Phone</Label>
                      <Input
                        id="biz-phone"
                        value={businessForm.phone}
                        onChange={(e) =>
                          setBusinessForm((f) => ({ ...f, phone: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="biz-email">Email</Label>
                      <Input
                        id="biz-email"
                        type="email"
                        value={businessForm.email}
                        onChange={(e) =>
                          setBusinessForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="biz-address">Address</Label>
                      <Input
                        id="biz-address"
                        value={businessForm.address}
                        onChange={(e) =>
                          setBusinessForm((f) => ({ ...f, address: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => void handleSaveBusinessInfo()}
                    disabled={savingBusiness}
                  >
                    {savingBusiness ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Business Info
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hours">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Operating Hours
              </CardTitle>
              <CardDescription>Set daily open and close times for court bookings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {hours.map((h, i) => (
                <div
                  key={h.day}
                  className="flex flex-col gap-3 rounded-2xl bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="w-28 font-medium">{h.day}</p>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={h.open}
                      disabled={h.closed}
                      onChange={(e) =>
                        setHours((prev) =>
                          prev.map((row, idx) => (idx === i ? { ...row, open: e.target.value } : row))
                        )
                      }
                      className="max-w-[140px]"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={h.close}
                      disabled={h.closed}
                      onChange={(e) =>
                        setHours((prev) =>
                          prev.map((row, idx) => (idx === i ? { ...row, close: e.target.value } : row))
                        )
                      }
                      className="max-w-[140px]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`closed-${h.day}`} className="text-xs text-muted-foreground">
                      Closed
                    </Label>
                    <Switch
                      id={`closed-${h.day}`}
                      checked={h.closed}
                      onCheckedChange={(checked) =>
                        setHours((prev) =>
                          prev.map((row, idx) => (idx === i ? { ...row, closed: checked } : row))
                        )
                      }
                    />
                  </div>
                </div>
              ))}
              <SaveButton label="Operating Hours" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Payment Methods
              </CardTitle>
              <CardDescription>Enable accepted payment channels for bookings, wallet, and shop.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  { key: "cash", label: "Cash" },
                  { key: "gcash", label: "GCash" },
                  { key: "maya", label: "Maya" },
                  { key: "qrph", label: "QRPH" },
                  { key: "card", label: "Credit / Debit Card" },
                ] as const
              ).map((method) => (
                <div
                  key={method.key}
                  className="flex items-center justify-between rounded-2xl bg-background/50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <p className="font-medium">{method.label}</p>
                  </div>
                  <Switch
                    checked={payments[method.key]}
                    onCheckedChange={(checked) =>
                      setPayments((prev) => ({ ...prev, [method.key]: checked }))
                    }
                  />
                </div>
              ))}
              <SaveButton label="Payment Methods" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                Named services and catalog defaults are managed on the Services page.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/services">Open Services catalog</Link>
              </Button>
            </CardContent>
          </Card>
          <BranchPricingPanel />
        </TabsContent>

        <TabsContent value="courts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Court Types
              </CardTitle>
              <CardDescription>
                Open Play courts can be assigned to the queue and open play
                sessions. Exclusive courts are for reservations and private
                bookings only.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!branch ? (
                <p className="text-sm text-muted-foreground">
                  Select a branch using the dropdown in the page header to
                  configure courts.
                </p>
              ) : loadingCourts ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading courts…
                </div>
              ) : branchCourts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courts found for this branch.
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {branchCourts.map((court) => {
                      const mode = courtModes[court.id] ?? "open_play";
                      return (
                        <div
                          key={court.id}
                          className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium">{court.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {mode === "open_play" ? (
                                <span className="inline-flex items-center gap-1">
                                  <Unlock className="h-3 w-3" />
                                  Open play eligible
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  Reservations only
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                            <select
                              className="flex h-10 w-full max-w-xs rounded-xl border border-border/70 bg-background px-3 text-sm sm:w-auto"
                              value={mode}
                              onChange={(e) => {
                                const next = e.target.value as CourtMode;
                                setCourtModes((prev) => ({
                                  ...prev,
                                  [court.id]: next,
                                }));
                              }}
                              aria-label={`Mode for ${court.name}`}
                            >
                              <option value="open_play">Open Play</option>
                              <option value="exclusive">Exclusive</option>
                            </select>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0 text-destructive hover:text-destructive"
                              aria-label={`Delete ${court.name}`}
                              onClick={() => setCourtToDelete(court)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => void handleSaveCourtModes()}
                    disabled={savingCourts}
                  >
                    {savingCourts ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Court Settings
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-primary" />
                Queue Rules
              </CardTitle>
              <CardDescription>Control how the open play queue assigns players to courts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="players-per-match">Players per Match</Label>
                  <Input
                    id="players-per-match"
                    type="number"
                    value={queueRules.playersPerMatch}
                    onChange={(e) =>
                      setQueueRules((q) => ({ ...q, playersPerMatch: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max-wait">Max Wait Time (minutes)</Label>
                  <Input
                    id="max-wait"
                    type="number"
                    value={queueRules.maxWaitMinutes}
                    onChange={(e) =>
                      setQueueRules((q) => ({ ...q, maxWaitMinutes: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                <div>
                  <p className="font-medium">Auto-assign courts</p>
                  <p className="text-xs text-muted-foreground">
                    Automatically place the next player group on an available court.
                  </p>
                </div>
                <Switch
                  checked={queueRules.autoAssignCourt}
                  onCheckedChange={(checked) =>
                    setQueueRules((q) => ({ ...q, autoAssignCourt: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                <div>
                  <p className="font-medium">Notify players when called</p>
                  <p className="text-xs text-muted-foreground">
                    Send a push notification when it&apos;s a player&apos;s turn.
                  </p>
                </div>
                <Switch
                  checked={queueRules.notifyPlayers}
                  onCheckedChange={(checked) =>
                    setQueueRules((q) => ({ ...q, notifyPlayers: checked }))
                  }
                />
              </div>
              <SaveButton label="Queue Rules" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="match">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-primary" />
                Match Rules
              </CardTitle>
              <CardDescription>Default scoring rules applied to open play and league matches.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="points-to-win">Points to Win</Label>
                  <Input
                    id="points-to-win"
                    type="number"
                    value={matchRules.pointsToWin}
                    onChange={(e) =>
                      setMatchRules((m) => ({ ...m, pointsToWin: Number(e.target.value) }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="best-of">Best Of (games)</Label>
                  <Input
                    id="best-of"
                    type="number"
                    value={matchRules.bestOf}
                    onChange={(e) =>
                      setMatchRules((m) => ({ ...m, bestOf: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                <div>
                  <p className="font-medium">Win by two</p>
                  <p className="text-xs text-muted-foreground">
                    Require a two-point lead to win a game.
                  </p>
                </div>
                <Switch
                  checked={matchRules.winByTwo}
                  onCheckedChange={(checked) => setMatchRules((m) => ({ ...m, winByTwo: checked }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-background/50 p-4">
                <div>
                  <p className="font-medium">Allow draws</p>
                  <p className="text-xs text-muted-foreground">
                    Permit matches to end in a tie for casual open play.
                  </p>
                </div>
                <Switch
                  checked={matchRules.allowDraws}
                  onCheckedChange={(checked) => setMatchRules((m) => ({ ...m, allowDraws: checked }))}
                />
              </div>
              <SaveButton label="Match Rules" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Branding
              </CardTitle>
              <CardDescription>Customize your club logo and color palette shown across the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4 rounded-2xl bg-background/50 p-4">
                <BrandMark size="md" className="h-16 w-16 shadow-lg shadow-primary/30" />
                <div className="flex-1">
                  <p className="font-medium">Club Logo</p>
                  <p className="text-xs text-muted-foreground">PNG or SVG, at least 256×256px.</p>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primary-color"
                      type="color"
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                      className="h-10 w-14 cursor-pointer rounded-xl border border-border/70 bg-transparent"
                    />
                    <Input
                      value={branding.primaryColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, primaryColor: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accent-color">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="accent-color"
                      type="color"
                      value={branding.accentColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, accentColor: e.target.value }))
                      }
                      className="h-10 w-14 cursor-pointer rounded-xl border border-border/70 bg-transparent"
                    />
                    <Input
                      value={branding.accentColor}
                      onChange={(e) =>
                        setBranding((b) => ({ ...b, accentColor: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: branding.primaryColor, color: "#fff" }}>
                  Primary Preview
                </Badge>
                <Badge style={{ backgroundColor: branding.accentColor, color: "#fff" }}>
                  Accent Preview
                </Badge>
              </div>

              <SaveButton label="Branding" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={courtToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingCourt) setCourtToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete court?</DialogTitle>
            <DialogDescription>
              {courtToDelete ? (
                <>
                  This permanently removes <strong>{courtToDelete.name}</strong> from
                  this branch. Bookings, sessions, or matches tied to this court may
                  block deletion.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deletingCourt}
              onClick={() => setCourtToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingCourt}
              onClick={() => void handleConfirmDeleteCourt()}
            >
              {deletingCourt ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete court"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
