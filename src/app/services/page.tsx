"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { BranchSelect } from "@/components/shared/branch-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BranchPricingPanel } from "@/components/settings/branch-pricing-panel";
import { DEMO_BRANCH_SERVICES } from "@/lib/demo-data";
import { centsToPesosInput, pesosToCents } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store";
import {
  createBranchService,
  deleteBranchService,
  listBranchServices,
  setBranchServiceActive,
  setDefaultBranchService,
  updateBranchService,
  type BranchService,
  type BranchServiceType,
} from "@/services/branch-services";

const TYPE_LABELS: Record<BranchServiceType, string> = {
  open_play: "Open Play",
  court_rental: "Court Rental",
};

const BILLING_LABELS = {
  per_session: "Per session",
  per_hour: "Per hour",
} as const;

type TypeFilter = "all" | BranchServiceType | "inactive";

type ServiceFormState = {
  name: string;
  description: string;
  service_type: BranchServiceType;
  pricePesos: string;
  is_active: boolean;
  is_default: boolean;
};

const EMPTY_FORM: ServiceFormState = {
  name: "",
  description: "",
  service_type: "open_play",
  pricePesos: "0",
  is_active: true,
  is_default: false,
};

export default function ServicesPage() {
  const { isDemoMode, branch } = useAuthStore();
  const branchId = branch?.id;

  const [services, setServices] = useState<BranchService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BranchService | null>(null);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);

  async function load() {
    if (!branchId) {
      setServices([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isDemoMode) {
      setServices(DEMO_BRANCH_SERVICES.filter((s) => s.branch_id === branchId));
      setLoading(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const svcRows = await listBranchServices(supabase, branchId);
      setServices(svcRows);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load services";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on branch / demo toggle
  }, [branchId, isDemoMode]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (typeFilter === "inactive") return !s.is_active;
      if (typeFilter === "all") return true;
      return s.service_type === typeFilter;
    });
  }, [services, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(svc: BranchService) {
    setEditing(svc);
    setForm({
      name: svc.name,
      description: svc.description ?? "",
      service_type: svc.service_type,
      pricePesos: centsToPesosInput(svc.price_cents),
      is_active: svc.is_active,
      is_default: svc.is_default,
    });
    setDialogOpen(true);
  }

  async function saveService() {
    if (!branchId) return;
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    const price_cents = pesosToCents(form.pricePesos);

    if (isDemoMode) {
      if (editing) {
        setServices((prev) =>
          prev.map((s) => {
            if (s.id !== editing.id) {
              if (form.is_default && s.service_type === form.service_type) {
                return { ...s, is_default: false };
              }
              return s;
            }
            return {
              ...s,
              name: form.name.trim(),
              description: form.description.trim() || null,
              service_type: form.service_type,
              billing_unit:
                form.service_type === "open_play" ? "per_session" : "per_hour",
              price_cents,
              is_active: form.is_active,
              is_default: form.is_default,
              updated_at: new Date().toISOString(),
            };
          })
        );
      } else {
        const id = `svc-${Date.now()}`;
        setServices((prev) => {
          const next = prev.map((s) =>
            form.is_default && s.service_type === form.service_type
              ? { ...s, is_default: false }
              : s
          );
          next.push({
            id,
            branch_id: branchId,
            name: form.name.trim(),
            description: form.description.trim() || null,
            service_type: form.service_type,
            billing_unit:
              form.service_type === "open_play" ? "per_session" : "per_hour",
            price_cents,
            is_active: form.is_active,
            is_default: form.is_default,
            sort_order: next.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          return next;
        });
      }
      toast.success(editing ? "Service updated" : "Service created");
      setDialogOpen(false);
      setSaving(false);
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (editing) {
        await updateBranchService(supabase, editing.id, {
          name: form.name,
          description: form.description,
          service_type: form.service_type,
          price_cents,
          is_active: form.is_active,
          is_default: form.is_default,
        });
      } else {
        await createBranchService(supabase, branchId, {
          name: form.name,
          description: form.description,
          service_type: form.service_type,
          price_cents,
          is_active: form.is_active,
          is_default: form.is_default,
        });
      }
      toast.success(editing ? "Service updated" : "Service created");
      setDialogOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save service";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(svc: BranchService) {
    if (isDemoMode) {
      if (svc.is_default && svc.is_active) {
        toast.error("Set another default before deactivating this service");
        return;
      }
      setServices((prev) =>
        prev.map((s) =>
          s.id === svc.id ? { ...s, is_active: !s.is_active } : s
        )
      );
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await setBranchServiceActive(supabase, svc.id, !svc.is_active);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update service";
      toast.error(message);
    }
  }

  async function makeDefault(svc: BranchService) {
    if (!svc.is_active) {
      toast.error("Activate the service before setting it as default");
      return;
    }

    if (isDemoMode) {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          is_default:
            s.service_type === svc.service_type ? s.id === svc.id : s.is_default,
        }))
      );
      toast.success("Default updated");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await setDefaultBranchService(supabase, svc.id);
      toast.success("Default updated");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default";
      toast.error(message);
    }
  }

  async function removeService(svc: BranchService) {
    if (isDemoMode) {
      if (svc.is_default || svc.is_active) {
        toast.error("Deactivate and unset default before deleting");
        return;
      }
      setServices((prev) => prev.filter((s) => s.id !== svc.id));
      toast.success("Service deleted");
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await deleteBranchService(supabase, svc.id);
      toast.success("Service deleted");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete";
      toast.error(message);
    }
  }

  return (
    <DashboardShell>
      <PageHeader
        title="Services"
        description="Manage billable services and branch/court fee defaults used for open play and reservations."
        actions={<BranchSelect />}
      />

      <Tabs defaultValue="catalog">
        <TabsList className="mb-4">
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="fees">Fee defaults</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "All"],
                  ["open_play", "Open Play"],
                  ["court_rental", "Court Rental"],
                  ["inactive", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={typeFilter === value ? "default" : "outline"}
                  onClick={() => setTypeFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button onClick={openCreate} disabled={!branchId}>
              <Plus className="h-4 w-4" />
              Add service
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading services…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="No services yet"
              description="Create open-play and court-rental services to power live pricing."
              action={
                <Button onClick={openCreate} disabled={!branchId}>
                  <Plus className="h-4 w-4" />
                  Add service
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((svc) => (
                <Card key={svc.id}>
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{svc.name}</p>
                        <Badge variant="secondary">
                          {TYPE_LABELS[svc.service_type]}
                        </Badge>
                        <Badge variant="outline">
                          {BILLING_LABELS[svc.billing_unit]}
                        </Badge>
                        {svc.is_default && (
                          <Badge variant="success">Default</Badge>
                        )}
                        {!svc.is_active && (
                          <Badge variant="warning">Inactive</Badge>
                        )}
                      </div>
                      {svc.description && (
                        <p className="text-sm text-muted-foreground">
                          {svc.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-2 text-lg font-semibold tabular-nums">
                        {formatCurrency(svc.price_cents / 100)}
                      </p>
                      {!svc.is_default && svc.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void makeDefault(svc)}
                        >
                          <Star className="h-4 w-4" />
                          Set default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(svc)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(svc)}
                      >
                        {svc.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      {!svc.is_active && !svc.is_default && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void removeService(svc)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <BranchPricingPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "Add service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="svc-name">Name</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-type">Type</Label>
              <select
                id="svc-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.service_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    service_type: e.target.value as BranchServiceType,
                  }))
                }
                disabled={!!editing}
              >
                <option value="open_play">Open Play (per session)</option>
                <option value="court_rental">Court Rental (per hour)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-price">Price (₱)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                value={form.pricePesos}
                onChange={(e) =>
                  setForm((f) => ({ ...f, pricePesos: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="svc-desc">Description</Label>
              <Input
                id="svc-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="svc-active">Active</Label>
              <Switch
                id="svc-active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_active: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="svc-default">Default for type</Label>
              <Switch
                id="svc-default"
                checked={form.is_default}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, is_default: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveService()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
