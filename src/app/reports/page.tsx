"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileBarChart,
  Banknote,
  Users,
  Wallet,
  UserCheck,
  Map,
  CalendarDays,
  Swords,
  Trophy,
  Package,
  RotateCcw,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaChartCard, BarChartCard } from "@/components/shared/charts";
import {
  DEMO_ATTENDANCE_CHART,
  DEMO_PLAYERS_GROWTH,
  DEMO_PEAK_HOURS,
  DEMO_REVENUE_CHART,
} from "@/lib/demo-data";

type ExportFormat = "pdf" | "csv" | "excel";

interface ReportCategory {
  key: string;
  title: string;
  description: string;
  icon: typeof FileBarChart;
}

const CATEGORIES: ReportCategory[] = [
  { key: "revenue", title: "Revenue", description: "Income by source and period", icon: Banknote },
  { key: "players", title: "Players", description: "Growth and active player trends", icon: Users },
  { key: "wallet", title: "Wallet", description: "Top-ups, cash-ins, transfers", icon: Wallet },
  { key: "attendance", title: "Attendance", description: "Check-ins and peak trends", icon: UserCheck },
  { key: "court_utilization", title: "Court Utilization", description: "Occupancy by court & hour", icon: Map },
  { key: "reservations", title: "Reservations", description: "Bookings, no-shows, cancellations", icon: CalendarDays },
  { key: "open_play", title: "Open Play", description: "Queue throughput & wait time", icon: Swords },
  { key: "tournament", title: "Tournament", description: "Entries, brackets, payouts", icon: Trophy },
  { key: "inventory", title: "Inventory", description: "Stock levels & sell-through", icon: Package },
  { key: "refunds", title: "Refunds", description: "Refunds and adjustments log", icon: RotateCcw },
];

const FORMAT_META: Record<ExportFormat, { label: string; icon: typeof FileDown }> = {
  pdf: { label: "PDF", icon: FileText },
  csv: { label: "CSV", icon: FileDown },
  excel: { label: "Excel", icon: FileSpreadsheet },
};

export default function ReportsPage() {
  const [selected, setSelected] = useState<string>("revenue");
  const [startDate, setStartDate] = useState("2026-07-01");
  const [endDate, setEndDate] = useState("2026-07-23");
  const [generating, setGenerating] = useState<ExportFormat | null>(null);

  const selectedCategory = CATEGORIES.find((c) => c.key === selected) ?? CATEGORIES[0];

  const generate = async (format: ExportFormat) => {
    setGenerating(format);
    const toastId = toast.loading(`Generating ${FORMAT_META[format].label} report…`);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const filename = `${selectedCategory.key}-report_${startDate}_to_${endDate}.${
      format === "excel" ? "xlsx" : format
    }`;
    toast.success(`${selectedCategory.title} report ready`, {
      id: toastId,
      description: `${filename} has been generated for download.`,
    });
    setGenerating(null);
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Report Generator"
        description="Build detailed operational and financial reports for any date range across your club."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CATEGORIES.map((cat, i) => {
          const Icon = cat.icon;
          const active = cat.key === selected;
          return (
            <motion.button
              key={cat.key}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i }}
              onClick={() => setSelected(cat.key)}
              className="text-left"
            >
              <Card
                className={
                  active
                    ? "border-primary/60 bg-primary/10 shadow-lg shadow-primary/10"
                    : "hover:border-primary/30"
                }
              >
                <CardContent className="p-4">
                  <div
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${
                      active ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">{cat.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-4 w-4 text-primary" />
              {selectedCategory.title} Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">From</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">To</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-background/50 p-3 text-xs text-muted-foreground">
              Report will include {selectedCategory.description.toLowerCase()} for the selected
              branch and date range.
            </div>

            <div className="space-y-2 pt-1">
              {(Object.keys(FORMAT_META) as ExportFormat[]).map((format) => {
                const meta = FORMAT_META[format];
                const Icon = meta.icon;
                const isLoading = generating === format;
                return (
                  <Button
                    key={format}
                    variant="outline"
                    className="w-full justify-start"
                    disabled={generating !== null}
                    onClick={() => generate(format)}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    Generate {meta.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <AreaChartCard title="Revenue Trend" data={DEMO_REVENUE_CHART} />
          <div className="grid gap-4 sm:grid-cols-2">
            <BarChartCard title="Attendance" data={DEMO_ATTENDANCE_CHART} color="#059669" />
            <BarChartCard title="Peak Hours" data={DEMO_PEAK_HOURS} color="#10b981" />
          </div>
          <AreaChartCard title="Players Growth" data={DEMO_PLAYERS_GROWTH} color="#22c55e" />
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Recently Generated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "revenue-report_2026-06-01_to_2026-06-30.pdf", size: "412 KB" },
            { name: "players-report_2026-Q2.xlsx", size: "88 KB" },
            { name: "attendance-report_2026-07-01_to_2026-07-15.csv", size: "24 KB" },
          ].map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between rounded-2xl bg-background/50 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
              <Badge variant="outline">{file.size}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
