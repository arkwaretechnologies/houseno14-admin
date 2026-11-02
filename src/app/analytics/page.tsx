"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Banknote,
  Users,
  UserCheck,
  Map,
  CalendarDays,
  BadgeAlert,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatWidget } from "@/components/shared/stat-widget";
import { AreaChartCard, BarChartCard } from "@/components/shared/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DEMO_ATTENDANCE_CHART,
  DEMO_COURTS,
  DEMO_DASHBOARD,
  DEMO_PLAYERS_GROWTH,
  DEMO_PEAK_HOURS,
  DEMO_REVENUE_CHART,
  DEMO_WALLET,
} from "@/lib/demo-data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AnalyticsPage() {
  const stats = DEMO_DASHBOARD;

  const courtUtilization = useMemo(
    () =>
      DEMO_COURTS.map((c) => ({
        label: c.name,
        value: c.status === "occupied" ? 92 : c.status === "reserved" ? 68 : c.status === "maintenance" ? 0 : 34,
      })),
    []
  );

  const totalWalletVolume = useMemo(
    () => DEMO_WALLET.reduce((sum, w) => sum + w.amount, 0),
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="Analytics"
        description="Deep dive into revenue, membership, attendance, and court performance trends."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget title="Today's Revenue" value={stats.todays_revenue} currency icon={Banknote} trend={{ value: 12.4 }} />
        <StatWidget title="Today's Attendance" value={stats.todays_attendance} icon={UserCheck} trend={{ value: 8.1 }} delay={0.05} />
        <StatWidget title="Active Members" value={stats.active_members} icon={Users} delay={0.1} />
        <StatWidget title="Court Usage" value={`${stats.court_usage_percent}%`} icon={Map} delay={0.15} />
        <StatWidget title="Upcoming Reservations" value={stats.upcoming_reservations} icon={CalendarDays} delay={0.2} />
        <StatWidget title="Memberships Expiring" value={stats.memberships_expiring} icon={BadgeAlert} delay={0.25} />
        <StatWidget title="Wallet Volume" value={totalWalletVolume} currency icon={Wallet} delay={0.3} />
        <StatWidget title="Tournaments Active" value={stats.tournaments_active} icon={TrendingUp} delay={0.35} />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AreaChartCard title="Revenue This Month" data={DEMO_REVENUE_CHART} />
        </div>
        <BarChartCard title="Attendance This Week" data={DEMO_ATTENDANCE_CHART} color="#059669" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AreaChartCard title="Players Growth" data={DEMO_PLAYERS_GROWTH} color="#22c55e" />
        <BarChartCard title="Peak Hours" data={DEMO_PEAK_HOURS} color="#10b981" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <BarChartCard title="Court Utilization" data={courtUtilization} color="#16a34a" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Wallet Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_WALLET.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex items-center justify-between rounded-2xl bg-background/50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{w.member?.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.type.replace("_", " ")} · {formatDateTime(w.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-600">
                    +{formatCurrency(w.amount)}
                  </p>
                  <Badge variant={w.status === "approved" ? "success" : "warning"}>
                    {w.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
