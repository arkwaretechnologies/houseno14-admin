"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Clock3,
  CalendarClock,
  UserX,
  BadgeCheck,
  ListOrdered,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChartCard } from "@/components/shared/charts";
import {
  DEMO_DASHBOARD,
  DEMO_MEMBERS,
  DEMO_PEAK_HOURS,
  DEMO_QUEUE,
  DEMO_REVENUE_CHART,
} from "@/lib/demo-data";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function AiBadge() {
  return (
    <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
      <Sparkles className="h-3 w-3" />
      AI Prediction · Sample
    </Badge>
  );
}

export default function AiInsightsPage() {
  const stats = DEMO_DASHBOARD;

  const forecast = useMemo(() => {
    const last = DEMO_REVENUE_CHART[DEMO_REVENUE_CHART.length - 1]?.value ?? 0;
    const growth = 1.08;
    return [
      ...DEMO_REVENUE_CHART,
      { label: "Jul 27*", value: Math.round(last * growth) },
      { label: "Jul 31*", value: Math.round(last * growth * 1.06) },
      { label: "Aug 4*", value: Math.round(last * growth * 1.11) },
    ];
  }, []);

  const peakHour = useMemo(
    () => DEMO_PEAK_HOURS.reduce((max, p) => (p.value > max.value ? p : max), DEMO_PEAK_HOURS[0]),
    []
  );

  const churnRisks = useMemo(
    () =>
      DEMO_MEMBERS.map((m) => {
        const daysSinceUpdate = Math.round(
          (Date.now() - new Date(m.updated_at).getTime()) / 86400000
        );
        let score = 10;
        if (m.status === "inactive") score += 55;
        if (m.status === "suspended") score += 35;
        if (m.wallet_balance < 500) score += 15;
        if (daysSinceUpdate > 60) score += 20;
        return { member: m, score: Math.min(score, 97) };
      })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4),
    []
  );

  const renewalSuggestions = useMemo(
    () =>
      DEMO_MEMBERS.filter((m) => m.status === "active")
        .slice(0, 3)
        .map((m, i) => ({
          member: m,
          suggestion: [
            "Offer 10% early-renewal discount before plan expiry",
            "Bundle open play credits to increase perceived value",
            "Upsell to VIP Annual — usage pattern matches VIP cohort",
          ][i % 3],
        })),
    []
  );

  const kpiScore = useMemo(() => {
    const utilization = stats.court_usage_percent;
    const retention = 82;
    const revenueHealth = 88;
    return Math.round((utilization + retention + revenueHealth) / 3);
  }, [stats.court_usage_percent]);

  const courtSuggestions = [
    {
      title: "Shift Court D maintenance to Tuesday 6–8AM",
      detail: "Lowest historical demand window — avoids 14 lost booking slots.",
    },
    {
      title: "Add a 3rd court to open play rotation on Saturdays",
      detail: "Predicted demand exceeds current capacity by ~22% at peak.",
    },
    {
      title: "Reserve Court C for coaching 4–6PM weekdays",
      detail: "Coaching demand up 18% month-over-month during this slot.",
    },
  ];

  const queueTips = [
    "Enable auto-assign for parties of 4 to cut average wait by ~6 minutes.",
    "Notify waiting players 2 positions early to reduce no-shows.",
    "Cap party size to 4 during peak hours to increase court turnover.",
  ];

  return (
    <DashboardShell>
      <PageHeader
        title="AI Insights"
        description="Predictive analytics and smart recommendations generated from your club's operational data."
        actions={<AiBadge />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-2"
        >
          <Card className="relative overflow-hidden border-primary/30">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Forecast
              </CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-baseline gap-3">
                <p className="text-3xl font-bold tracking-tight">
                  {formatCurrency(forecast[forecast.length - 1].value)}
                </p>
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <ArrowUpRight className="h-4 w-4" />
                  +11.2% projected by Aug 4
                </span>
              </div>
              <AreaChartCard title="Projected Revenue (14-day)" data={forecast} color="#22c55e" height={240} />
              <p className="mt-3 text-xs text-muted-foreground">
                * Forecasted values based on 30-day trailing trend and seasonality. For planning purposes only.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-primary" />
                Business KPI Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <svg className="h-36 w-36 -rotate-90">
                  <circle cx="72" cy="72" r="60" strokeWidth="12" className="fill-none stroke-muted" />
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="fill-none stroke-primary transition-all duration-700"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - kpiScore / 100)}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold tracking-tight">{kpiScore}</span>
                  <span className="text-xs text-muted-foreground">out of 100</span>
                </div>
              </div>
              <Badge variant="success">Healthy & Growing</Badge>
              <p className="text-center text-xs text-muted-foreground">
                Composite of court utilization, member retention, and revenue health signals.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />
                Peak Hour Prediction
              </CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-primary/10 p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Predicted busiest hour tomorrow</p>
                  <p className="text-2xl font-bold tracking-tight">{peakHour.label}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Expected players</p>
                  <p className="text-2xl font-bold text-primary">~{peakHour.value + 6}</p>
                </div>
              </div>
              <div className="space-y-2">
                {DEMO_PEAK_HOURS.slice(3, 8).map((p) => (
                  <div key={p.label} className="flex items-center gap-3">
                    <span className="w-12 text-xs text-muted-foreground">{p.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{ width: `${Math.min((p.value / 60) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Court Scheduling Suggestions
              </CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent className="space-y-3">
              {courtSuggestions.map((s) => (
                <div key={s.title} className="rounded-2xl bg-background/50 p-4">
                  <p className="flex items-start gap-2 text-sm font-medium">
                    <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {s.title}
                  </p>
                  <p className="mt-1 pl-6 text-xs text-muted-foreground">{s.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-primary" />
                Member Churn Risk
              </CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent className="space-y-3">
              {churnRisks.map(({ member, score }) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-background/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.member_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          score > 70 ? "bg-rose-500" : score > 40 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <Badge variant={score > 70 ? "destructive" : score > 40 ? "warning" : "success"}>
                      {score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                Renewal Suggestions
              </CardTitle>
              <AiBadge />
            </CardHeader>
            <CardContent className="space-y-3">
              {renewalSuggestions.map(({ member, suggestion }) => (
                <div key={member.id} className="flex items-start gap-3 rounded-2xl bg-background/50 p-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.full_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{suggestion}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" />
              Queue Optimization Tips
            </CardTitle>
            <AiBadge />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {queueTips.map((tip, i) => (
              <div key={tip} className="rounded-2xl bg-background/50 p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <p className="text-sm">{tip}</p>
              </div>
            ))}
            <div className="col-span-full flex items-center justify-between rounded-2xl bg-background/50 p-3 text-xs text-muted-foreground sm:col-span-3">
              <span>Current queue depth: {DEMO_QUEUE.filter((q) => q.status === "waiting").length} waiting</span>
              <span className="flex items-center gap-1 text-emerald-600">
                <ArrowDownRight className="h-3.5 w-3.5" />
                Wait time trending down
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardShell>
  );
}
