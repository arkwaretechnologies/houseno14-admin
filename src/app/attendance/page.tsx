"use client";

import { Fragment, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import { UserCheck, Flame, UserX, Repeat, Clock } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatWidget } from "@/components/shared/stat-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChartCard } from "@/components/shared/charts";
import {
  DEMO_ATTENDANCE,
  DEMO_HEATMAP,
  DEMO_MEMBERS,
  DEMO_PEAK_HOURS,
} from "@/lib/demo-data";
import { formatDateTime, getInitials } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function heatColor(value: number, max: number) {
  const intensity = Math.min(1, value / max);
  if (intensity < 0.15) return "bg-muted/40";
  if (intensity < 0.35) return "bg-emerald-500/20";
  if (intensity < 0.55) return "bg-emerald-500/40";
  if (intensity < 0.75) return "bg-emerald-500/65";
  return "bg-emerald-500/90";
}

export default function AttendancePage() {
  const [records] = useState<AttendanceRecord[]>(DEMO_ATTENDANCE);

  const stats = useMemo(() => {
    const checkedIn = records.filter((r) => !r.check_out_at).length;
    const activeMembers = DEMO_MEMBERS.filter((m) => m.status === "active").length;
    const inactiveMembers = DEMO_MEMBERS.filter((m) => m.status === "inactive").length;
    const returning = Math.round(activeMembers * 0.62);
    return { checkedIn, returning, inactiveMembers };
  }, [records]);

  const maxHeat = useMemo(
    () => Math.max(...DEMO_HEATMAP.map((c) => c.value)),
    []
  );

  const hours = useMemo(
    () => Array.from(new Set(DEMO_HEATMAP.map((c) => c.hour))).sort((a, b) => a - b),
    []
  );

  const columns: ColumnDef<AttendanceRecord, unknown>[] = useMemo(
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
              <span className="font-medium">{m?.full_name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "check_in_at",
        header: "Check-in",
        cell: ({ row }) => formatDateTime(row.original.check_in_at),
      },
      {
        accessorKey: "check_out_at",
        header: "Check-out",
        cell: ({ row }) =>
          row.original.check_out_at ? (
            formatDateTime(row.original.check_out_at)
          ) : (
            <Badge variant="success">On premises</Badge>
          ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <Badge variant="outline" className="capitalize">
            {row.original.source.replace("_", " ")}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Attendance"
        description="Live check-ins, peak hours, and weekly traffic patterns."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget title="Currently Checked-in" value={stats.checkedIn} icon={UserCheck} delay={0.05} />
        <StatWidget title="Returning Members" value={stats.returning} icon={Repeat} delay={0.1} />
        <StatWidget title="Inactive Members" value={stats.inactiveMembers} icon={UserX} delay={0.15} />
        <StatWidget title="Avg. Session" value="72 min" icon={Clock} delay={0.2} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">Today&apos;s Attendance</h3>
          </div>
          <DataTable
            columns={columns}
            data={records}
            searchPlaceholder="Search member…"
            emptyTitle="No check-ins yet"
            emptyDescription="Attendance records will appear here in real time."
          />
        </div>
        <BarChartCard title="Peak Hours" data={DEMO_PEAK_HOURS} color="#10b981" />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-primary" />
              Weekly Traffic Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `48px repeat(${DAYS.length}, 1fr)` }}
                >
                  <div />
                  {DAYS.map((d) => (
                    <div
                      key={d}
                      className="pb-1 text-center text-xs font-medium text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                  {hours.map((hour) => (
                    <Fragment key={`row-${hour}`}>
                      <div className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
                        {hour}:00
                      </div>
                      {DAYS.map((day) => {
                        const cell = DEMO_HEATMAP.find(
                          (c) => c.day === day && c.hour === hour
                        );
                        const value = cell?.value ?? 0;
                        return (
                          <motion.div
                            key={`${day}-${hour}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25 }}
                            title={`${day} ${hour}:00 — ${value} visits`}
                            className={`aspect-square rounded-md ${heatColor(value, maxHeat)}`}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                  <span>Low</span>
                  <span className="h-3 w-3 rounded bg-muted/40" />
                  <span className="h-3 w-3 rounded bg-emerald-500/20" />
                  <span className="h-3 w-3 rounded bg-emerald-500/40" />
                  <span className="h-3 w-3 rounded bg-emerald-500/65" />
                  <span className="h-3 w-3 rounded bg-emerald-500/90" />
                  <span>High</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
