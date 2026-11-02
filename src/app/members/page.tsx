"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Download,
  Loader2,
  Plus,
  Users,
  UserCheck,
  UserX,
  Trophy,
  Wallet,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatWidget } from "@/components/shared/stat-widget";
import { BranchSelect } from "@/components/shared/branch-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DEMO_MEMBERS } from "@/lib/demo-data";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { listMembers } from "@/services/members";
import type { Member } from "@/types";

const STATUS_VARIANT: Record<
  Member["status"],
  "success" | "secondary" | "warning" | "destructive"
> = {
  active: "success",
  inactive: "secondary",
  suspended: "warning",
  deleted: "destructive",
};

export default function MembersPage() {
  const { isDemoMode, branch } = useAuthStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      if (isDemoMode) {
        if (!cancelled) {
          setMembers(DEMO_MEMBERS);
          setLoading(false);
        }
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const result = await listMembers(supabase, {
          branchId: branch?.id,
          pageSize: 200,
        });
        if (!cancelled) setMembers(result.data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load members";
        toast.error(message);
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemoMode, branch?.id]);

  const stats = useMemo(() => {
    const active = members.filter((m) => m.status === "active").length;
    const suspended = members.filter((m) => m.status === "suspended").length;
    const avgElo = Math.round(
      members.reduce((sum, m) => sum + m.elo_rating, 0) / (members.length || 1)
    );
    const totalWallet = members.reduce((sum, m) => sum + m.wallet_balance, 0);
    return { active, suspended, avgElo, totalWallet };
  }, [members]);

  const columns: ColumnDef<Member, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "member_code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.member_code}
          </span>
        ),
      },
      {
        accessorKey: "full_name",
        header: "Member",
        cell: ({ row }) => {
          const m = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{m.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Joined {formatDate(m.joined_at)}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Contact",
        cell: ({ row }) => (
          <div className="space-y-0.5 text-xs text-muted-foreground">
            {row.original.email ? (
              <p className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" /> {row.original.email}
              </p>
            ) : null}
            {row.original.phone ? (
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {row.original.phone}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "rfid_tag",
        header: "RFID",
        cell: ({ row }) =>
          row.original.rfid_tag ? (
            <Badge variant="outline" className="font-mono">
              {row.original.rfid_tag}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Not assigned</span>
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "wallet_balance",
        header: "Wallet",
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.wallet_balance)}
          </span>
        ),
      },
      {
        accessorKey: "elo_rating",
        header: "ELO",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-medium">{row.original.elo_rating}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.success(`Opened profile for ${row.original.full_name}`)
            }
          >
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Members"
        description="Manage club members, wallets, RFID tags, and ELO ratings."
        actions={
          <>
            <BranchSelect />
            <Button
              variant="outline"
              onClick={() => toast.success("Members exported to Excel")}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              onClick={() => toast.message("This action isn’t available yet")}
            >
              <Plus className="h-4 w-4" />
              Create Member
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget
          title="Total Members"
          value={members.length}
          icon={Users}
          delay={0.05}
        />
        <StatWidget
          title="Active"
          value={stats.active}
          icon={UserCheck}
          delay={0.1}
        />
        <StatWidget
          title="Suspended"
          value={stats.suspended}
          icon={UserX}
          delay={0.15}
        />
        <StatWidget
          title="Total Wallet Balance"
          value={stats.totalWallet}
          currency
          icon={Wallet}
          delay={0.2}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading members…
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={members}
            searchKey="full_name"
            searchPlaceholder="Search by member name…"
            emptyTitle="No members found"
            emptyDescription="Members with role “member” in this branch will appear here."
          />
        )}
      </div>
    </DashboardShell>
  );
}
