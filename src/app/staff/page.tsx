"use client";

import { useCallback, useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Shield, Plus, History, MapPin, Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { AddStaffDialog } from "@/components/staff/add-staff-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DEMO_AUDIT, DEMO_STAFF_LIST } from "@/lib/demo-data";
import { formatDateTime, getInitials } from "@/lib/utils";
import { ROLE_LABELS, type StaffRole } from "@/lib/constants";
import { useAuthStore } from "@/store";
import type { StaffProfile } from "@/types";

const ROLE_VARIANT: Record<StaffRole, "default" | "secondary" | "success" | "warning" | "outline"> = {
  super_admin: "default",
  manager: "success",
  cashier: "warning",
  receptionist: "secondary",
  coach: "outline",
};

const columns: ColumnDef<StaffProfile, unknown>[] = [
  {
    id: "name",
    header: "Staff Member",
    accessorFn: (row) => row.full_name,
    cell: ({ row }) => {
      const s = row.original;
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(s.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{s.full_name}</p>
            <p className="text-xs text-muted-foreground">{s.email || "—"}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge variant={ROLE_VARIANT[row.original.role]}>{ROLE_LABELS[row.original.role]}</Badge>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone ?? "—"}</span>
    ),
  },
  {
    accessorKey: "last_login_at",
    header: "Last Login",
    cell: ({ row }) =>
      row.original.last_login_at ? formatDateTime(row.original.last_login_at) : "Never",
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.is_active ? "success" : "secondary"}>
        {row.original.is_active ? "Active" : "Suspended"}
      </Badge>
    ),
  },
];

export default function StaffPage() {
  const { isDemoMode, branch, role } = useAuthStore();
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    if (isDemoMode) {
      setStaff(DEMO_STAFF_LIST);
      setLoading(false);
      return;
    }

    try {
      const params = branch?.id ? `?branch_id=${encodeURIComponent(branch.id)}` : "";
      const res = await fetch(`/api/staff${params}`);
      const json = (await res.json()) as { data?: StaffProfile[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load staff");
      setStaff(json.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, branch?.id]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const canManageStaff = role === "super_admin" || role === "manager";

  return (
    <DashboardShell>
      <PageHeader
        title="Staff Management"
        description="Manage team access, roles, and permissions across your club."
        actions={
          canManageStaff ? (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Staff Member
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading staff…
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={staff}
          searchKey="full_name"
          searchPlaceholder="Search staff…"
          emptyTitle="No staff members"
          emptyDescription="Invite your first team member to get started."
          toolbar={
            <Badge variant="secondary" className="gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {staff.filter((s) => s.is_active).length} active
            </Badge>
          }
        />
      )}

      <AddStaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        branchId={branch?.id}
        actorRole={role}
        isDemoMode={isDemoMode}
        onCreated={(member) => setStaff((prev) => [...prev, member])}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Activity & Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DEMO_AUDIT.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="flex flex-col gap-2 rounded-2xl bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium">
                  {log.actor_name} · <span className="font-mono text-primary">{log.action}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""} ·{" "}
                  {formatDateTime(log.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {log.ip_address ?? "Unknown IP"}
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
