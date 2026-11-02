"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  Star,
  Gift,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_MEMBERS, DEMO_PLANS } from "@/lib/demo-data";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import type { MemberMembership, MembershipPlan } from "@/types";

const PLAN_TYPE_LABEL: Record<MembershipPlan["plan_type"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  vip: "VIP",
};

function buildActiveMemberships(plans: MembershipPlan[]): MemberMembership[] {
  return DEMO_MEMBERS.filter((m) => m.status === "active").map((member, i) => {
    const plan = plans[i % plans.length];
    const start = new Date(Date.now() - (i + 1) * 5 * 86400000);
    const end = new Date(start.getTime() + plan.duration_days * 86400000);
    return {
      id: `mm-${member.id}`,
      member_id: member.id,
      plan_id: plan.id,
      branch_id: plan.branch_id ?? "branch-1",
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: end.getTime() < Date.now() ? "expired" : "active",
      amount_paid: plan.price,
      created_at: start.toISOString(),
      plan,
      member,
    };
  });
}

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>(DEMO_PLANS);
  const activeMemberships = useMemo(() => buildActiveMemberships(plans), [plans]);

  const toggleStatus = (id: string) => {
    setPlans((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "active" ? "inactive" : "active" }
          : p
      )
    );
    toast.success("Plan status updated");
  };

  const membershipColumns: ColumnDef<MemberMembership, unknown>[] = useMemo(
    () => [
      {
        id: "member",
        header: "Member",
        accessorFn: (row) => row.member?.full_name ?? "",
        cell: ({ row }) => {
          const m = row.original.member;
          if (!m) return null;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(m.full_name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{m.full_name}</span>
            </div>
          );
        },
      },
      {
        id: "plan",
        header: "Plan",
        accessorFn: (row) => row.plan?.name ?? "",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.plan?.name}</Badge>
        ),
      },
      {
        accessorKey: "starts_at",
        header: "Starts",
        cell: ({ row }) => formatDate(row.original.starts_at),
      },
      {
        accessorKey: "ends_at",
        header: "Ends",
        cell: ({ row }) => formatDate(row.original.ends_at),
      },
      {
        accessorKey: "amount_paid",
        header: "Paid",
        cell: ({ row }) => formatCurrency(row.original.amount_paid),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "active"
                ? "success"
                : row.original.status === "expired"
                  ? "destructive"
                  : "secondary"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Memberships"
        description="Configure membership plans and monitor active subscriptions."
        actions={
          <Button onClick={() => toast.message("This action isn’t available yet")}>
            <Plus className="h-4 w-4" />
            Create Plan
          </Button>
        }
      />

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="active">Active Memberships</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plans.length === 0 ? (
            <EmptyState
              title="No plans yet"
              description="Create your first membership plan."
              icon={<Sparkles className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Card className="relative flex h-full flex-col overflow-hidden">
                    {plan.plan_type === "vip" ? (
                      <div className="absolute right-4 top-4">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      </div>
                    ) : null}
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{PLAN_TYPE_LABEL[plan.plan_type]}</Badge>
                        <Badge variant={plan.status === "active" ? "success" : "secondary"}>
                          {plan.status}
                        </Badge>
                      </div>
                      <CardTitle className="pt-1">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1 pt-1">
                        <span className="text-3xl font-semibold tracking-tight">
                          {formatCurrency(plan.price)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          / {plan.duration_days}d
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <ul className="space-y-2 text-sm">
                        {plan.benefits.map((b) => (
                          <li key={b} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-muted-foreground">{b}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto space-y-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarClock className="h-3.5 w-3.5 text-primary" />
                          Priority booking:{" "}
                          <span className="font-medium text-foreground">
                            {plan.priority_booking ? "Yes" : "No"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Gift className="h-3.5 w-3.5 text-primary" />
                          Free open play credits:{" "}
                          <span className="font-medium text-foreground">
                            {plan.free_open_play_credits}
                          </span>
                        </div>
                        {plan.discount_percent > 0 ? (
                          <div>
                            Discount:{" "}
                            <span className="font-medium text-foreground">
                              {plan.discount_percent}%
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toast.success(`Editing ${plan.name}`)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleStatus(plan.id)}
                        >
                          {plan.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toast.error(`${plan.name} archived`)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active">
          <DataTable
            columns={membershipColumns}
            data={activeMemberships}
            searchPlaceholder="Search active memberships…"
            emptyTitle="No active memberships"
            emptyDescription="Members with active plans will appear here."
          />
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}
