"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { TicketPercent, Plus, Percent, Coins, Users } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DEMO_PROMOS } from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PromoCode } from "@/types";

const TARGET_LABELS: Record<PromoCode["target"], string> = {
  all: "All Members",
  vip: "VIP Only",
  new: "New Members",
  expiring: "Expiring Soon",
};

const columns: ColumnDef<PromoCode, unknown>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => (
      <div>
        <p className="font-mono font-semibold tracking-wide">{row.original.code}</p>
        <p className="text-xs text-muted-foreground">{row.original.description}</p>
      </div>
    ),
  },
  {
    id: "discount",
    header: "Discount",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <div className="flex items-center gap-1.5 font-medium">
          {p.discount_type === "percent" ? (
            <Percent className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Coins className="h-3.5 w-3.5 text-primary" />
          )}
          {p.discount_type === "percent" ? `${p.discount_value}%` : formatCurrency(p.discount_value)}
        </div>
      );
    },
  },
  {
    id: "target",
    header: "Audience",
    cell: ({ row }) => (
      <Badge variant="outline" className="gap-1">
        <Users className="h-3 w-3" />
        {TARGET_LABELS[row.original.target]}
      </Badge>
    ),
  },
  {
    id: "usage",
    header: "Usage",
    cell: ({ row }) => {
      const p = row.original;
      const pct = p.max_uses ? Math.round((p.used_count / p.max_uses) * 100) : null;
      return (
        <div className="min-w-[120px]">
          <p className="text-sm">
            {p.used_count} {p.max_uses ? `/ ${p.max_uses}` : "(unlimited)"}
          </p>
          {pct !== null ? (
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "validity",
    header: "Validity",
    cell: ({ row }) => {
      const p = row.original;
      return (
        <p className="text-xs text-muted-foreground">
          {formatDate(p.starts_at)} – {p.ends_at ? formatDate(p.ends_at) : "No expiry"}
        </p>
      );
    },
  },
  {
    id: "active",
    header: "Active",
    cell: ({ row }) => <PromoActiveToggle promo={row.original} />,
  },
];

function PromoActiveToggle({ promo }: { promo: PromoCode }) {
  const [active, setActive] = useState(promo.is_active);
  return (
    <Switch
      checked={active}
      onCheckedChange={(checked) => {
        setActive(checked);
        toast.success(`${promo.code} ${checked ? "activated" : "deactivated"}`);
      }}
    />
  );
}

export default function PromotionsPage() {
  const [promos] = useState<PromoCode[]>(DEMO_PROMOS);

  const handleCreate = () => {
    toast.success("Promo code drafted", {
      description: "Set discount rules and audience, then activate.",
    });
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Promotions"
        description="Create and manage discount codes for memberships, wallet top-ups, and bookings."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Create Promo Code
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={promos}
        searchKey="code"
        searchPlaceholder="Search promo codes…"
        emptyTitle="No promo codes"
        emptyDescription="Create your first promotion to drive membership sign-ups and top-ups."
        toolbar={
          <Badge variant="secondary" className="gap-1.5">
            <TicketPercent className="h-3.5 w-3.5" />
            {promos.filter((p) => p.is_active).length} active
          </Badge>
        }
      />
    </DashboardShell>
  );
}
