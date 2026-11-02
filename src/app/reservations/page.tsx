"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  Plus,
  Check,
  X,
  ArrowRightLeft,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEMO_COURTS, DEMO_MEMBERS, DEMO_RESERVATIONS } from "@/lib/demo-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Reservation } from "@/types";

const EXTRA_RESERVATIONS: Reservation[] = [
  {
    id: "r3",
    branch_id: "branch-1",
    court_id: "c1",
    member_id: "m2",
    guest_name: null,
    starts_at: new Date(Date.now() - 30 * 60000).toISOString(),
    ends_at: new Date(Date.now() + 30 * 60000).toISOString(),
    status: "confirmed",
    amount: 600,
    payment_status: "completed",
    notes: null,
    created_by: "staff-1",
    created_at: new Date().toISOString(),
    court: DEMO_COURTS[0],
    member: DEMO_MEMBERS[1],
  },
  {
    id: "r4",
    branch_id: "branch-1",
    court_id: "c4",
    member_id: null,
    guest_name: "Walk-in: Rafael Ong",
    starts_at: new Date(Date.now() + 24 * 60 * 60000).toISOString(),
    ends_at: new Date(Date.now() + 25 * 60 * 60000).toISOString(),
    status: "pending",
    amount: 600,
    payment_status: "pending",
    notes: "Awaiting payment confirmation",
    created_by: "staff-2",
    created_at: new Date().toISOString(),
    court: DEMO_COURTS[2],
    member: undefined,
  },
];

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([
    ...DEMO_RESERVATIONS,
    ...EXTRA_RESERVATIONS,
  ]);

  const today = useMemo(
    () => reservations.filter((r) => isToday(r.starts_at)),
    [reservations]
  );
  const upcoming = useMemo(
    () =>
      [...reservations]
        .filter((r) => new Date(r.starts_at).getTime() > Date.now())
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [reservations]
  );
  const pending = useMemo(
    () => reservations.filter((r) => r.status === "pending"),
    [reservations]
  );

  const updateStatus = (id: string, status: Reservation["status"]) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    toast[status === "cancelled" ? "error" : "success"](
      status === "confirmed"
        ? "Reservation approved"
        : status === "cancelled"
          ? "Reservation cancelled"
          : "Reservation updated"
    );
  };

  const handleMove = (r: Reservation) => {
    const otherCourts = DEMO_COURTS.filter((c) => c.id !== r.court_id);
    const target = otherCourts[Math.floor(Math.random() * otherCourts.length)];
    setReservations((prev) =>
      prev.map((res) =>
        res.id === r.id ? { ...res, court_id: target.id, court: target } : res
      )
    );
    toast.success(`Moved reservation to ${target.name}`);
  };

  const handleWalkIn = () => {
    const court = DEMO_COURTS.find((c) => c.status === "available") ?? DEMO_COURTS[0];
    const newRes: Reservation = {
      id: `r${Date.now()}`,
      branch_id: "branch-1",
      court_id: court.id,
      member_id: null,
      guest_name: "Walk-in guest",
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 60 * 60000).toISOString(),
      status: "confirmed",
      amount: court.hourly_rate,
      payment_status: "pending",
      notes: null,
      created_by: "staff-1",
      created_at: new Date().toISOString(),
      court,
      member: undefined,
    };
    setReservations((prev) => [newRes, ...prev]);
    toast.success(`Walk-in booked on ${court.name}`);
  };

  const columns: ColumnDef<Reservation, unknown>[] = useMemo(
    () => [
      {
        id: "who",
        header: "Guest / Member",
        accessorFn: (row) => row.member?.full_name ?? row.guest_name ?? "",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.member?.full_name ?? row.original.guest_name ?? "—"}
          </span>
        ),
      },
      {
        id: "court",
        header: "Court",
        accessorFn: (row) => row.court?.name ?? "",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.court?.name}</Badge>
        ),
      },
      {
        accessorKey: "starts_at",
        header: "Starts",
        cell: ({ row }) => formatDateTime(row.original.starts_at),
      },
      {
        accessorKey: "ends_at",
        header: "Ends",
        cell: ({ row }) => formatDateTime(row.original.ends_at),
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => formatCurrency(row.original.amount),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.status === "confirmed"
                ? "success"
                : row.original.status === "pending"
                  ? "warning"
                  : row.original.status === "cancelled"
                    ? "destructive"
                    : "secondary"
            }
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.status === "pending" ? (
              <Button
                size="sm"
                variant="soft"
                onClick={() => updateStatus(row.original.id, "confirmed")}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleMove(row.original)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Move
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => updateStatus(row.original.id, "cancelled")}
              disabled={row.original.status === "cancelled"}
            >
              <X className="h-3.5 w-3.5 text-destructive" />
              Cancel
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Reservations"
        description="Manage court bookings, walk-ins, and pending approvals."
        actions={
          <Button onClick={handleWalkIn}>
            <Plus className="h-4 w-4" />
            Walk-in
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Tabs defaultValue="today">
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
            </TabsList>
            <TabsContent value="today">
              <DataTable
                columns={columns}
                data={today}
                searchPlaceholder="Search reservations…"
                emptyTitle="No reservations today"
              />
            </TabsContent>
            <TabsContent value="upcoming">
              <DataTable
                columns={columns}
                data={upcoming}
                searchPlaceholder="Search reservations…"
                emptyTitle="No upcoming reservations"
              />
            </TabsContent>
            <TabsContent value="pending">
              <DataTable
                columns={columns}
                data={pending}
                searchPlaceholder="Search reservations…"
                emptyTitle="No pending reservations"
              />
            </TabsContent>
          </Tabs>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Upcoming Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState title="Nothing scheduled" />
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 6).map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 rounded-2xl bg-background/50 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {r.member?.full_name ?? r.guest_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {r.court?.name} · {formatDateTime(r.starts_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
