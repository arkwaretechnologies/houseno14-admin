"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Check,
  X,
  FileText,
  FileSpreadsheet,
  Wallet,
  Clock,
  CheckCircle2,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatWidget } from "@/components/shared/stat-widget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_MEMBERS, DEMO_WALLET } from "@/lib/demo-data";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";
import type { WalletTransaction } from "@/types";

const EXTRA_TX: WalletTransaction[] = [
  {
    id: "w3",
    branch_id: "branch-1",
    member_id: "m3",
    type: "top_up",
    amount: 500,
    balance_before: 120,
    balance_after: 620,
    payment_method: "maya",
    status: "pending",
    reference: "MY-30219",
    notes: null,
    approved_by: null,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    member: DEMO_MEMBERS[2],
  },
  {
    id: "w4",
    branch_id: "branch-1",
    member_id: "m2",
    type: "top_up",
    amount: 1500,
    balance_before: 800,
    balance_after: 2300,
    payment_method: "gcash",
    status: "rejected",
    reference: "GC-10022",
    notes: "Invalid receipt",
    approved_by: null,
    created_at: new Date(Date.now() - 5400000).toISOString(),
    member: DEMO_MEMBERS[1],
  },
];

const STATUS_VARIANT: Record<WalletTransaction["status"], "success" | "warning" | "destructive" | "secondary"> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  completed: "success",
  cancelled: "secondary",
};

export default function WalletPage() {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([
    ...DEMO_WALLET,
    ...EXTRA_TX,
  ]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  const stats = useMemo(() => {
    const todayTopups = transactions.filter(
      (t) => t.type === "top_up" || t.type === "cash_in"
    );
    const pending = transactions.filter((t) => t.status === "pending");
    const approvedToday = transactions.filter((t) => t.status === "approved");
    const totalAmount = todayTopups.reduce((sum, t) => sum + t.amount, 0);
    return {
      count: todayTopups.length,
      pendingCount: pending.length,
      approvedCount: approvedToday.length,
      totalAmount,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (filter === "all") return transactions;
    if (filter === "pending") return transactions.filter((t) => t.status === "pending");
    return transactions.filter((t) => t.status === "approved" || t.status === "completed");
  }, [transactions, filter]);

  const updateStatus = (id: string, status: WalletTransaction["status"]) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
    const tx = transactions.find((t) => t.id === id);
    if (status === "approved") {
      toast.success(`Approved top-up for ${tx?.member?.full_name ?? "member"}`);
    } else {
      toast.error(`Rejected top-up for ${tx?.member?.full_name ?? "member"}`);
    }
  };

  const columns: ColumnDef<WalletTransaction, unknown>[] = useMemo(
    () => [
      {
        id: "member",
        header: "Member",
        accessorFn: (row) => row.member?.full_name ?? "",
        cell: ({ row }) => {
          const m = row.original.member;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(m?.full_name ?? "?")}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{m?.full_name ?? "Unknown"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.type.replace("_", " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "payment_method",
        header: "Method",
        cell: ({ row }) => (
          <span className="capitalize text-muted-foreground">
            {row.original.payment_method ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.reference}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.created_at)}
          </span>
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
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="soft"
                onClick={() => updateStatus(row.original.id, "approved")}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateStatus(row.original.id, "rejected")}
              >
                <X className="h-3.5 w-3.5 text-destructive" />
                Reject
              </Button>
            </div>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Wallet & Top-ups"
        description="Approve pending top-ups and monitor wallet activity across members."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast.success("Wallet report exported as PDF")}
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success("Wallet report exported as Excel")}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget title="Today's Top-ups" value={stats.count} icon={Wallet} delay={0.05} />
        <StatWidget title="Pending Approval" value={stats.pendingCount} icon={Clock} delay={0.1} />
        <StatWidget title="Approved" value={stats.approvedCount} icon={CheckCircle2} delay={0.15} />
        <StatWidget
          title="Total Volume"
          value={stats.totalAmount}
          currency
          icon={Banknote}
          delay={0.2}
        />
      </div>

      <div className="mt-6">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>
          <TabsContent value={filter}>
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Search transactions…"
              emptyTitle="No transactions"
              emptyDescription="Wallet activity will appear here."
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
