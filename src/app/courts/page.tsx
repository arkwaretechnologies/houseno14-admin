"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Map,
  Users,
  Banknote,
  Lock,
  Unlock,
  Wrench,
  CheckCircle2,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { StatWidget } from "@/components/shared/stat-widget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEMO_COURTS } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import type { CourtStatus } from "@/lib/constants";
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type SkillLevel,
} from "@/lib/constants";
import type { Court } from "@/types";
import { useAuthStore } from "@/store";
import {
  listCourts,
  updateCourtSkillLevel,
  updateCourtStatus,
} from "@/services/courts";

const STATUS_VARIANT: Record<
  CourtStatus,
  "success" | "default" | "secondary" | "warning" | "destructive"
> = {
  available: "success",
  occupied: "default",
  reserved: "secondary",
  maintenance: "warning",
  closed: "destructive",
};

export default function CourtsPage() {
  const { isDemoMode, branch } = useAuthStore();
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (isDemoMode) {
        if (!cancelled) {
          setCourts(DEMO_COURTS);
          setLoading(false);
        }
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const data = await listCourts(supabase, branch?.id);
        if (!cancelled) {
          setCourts(data);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load courts";
        toast.error(message);
        if (!cancelled) {
          setCourts([]);
        }
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
    const available = courts.filter((c) => c.status === "available").length;
    const occupied = courts.filter((c) => c.status === "occupied").length;
    const maintenance = courts.filter((c) => c.status === "maintenance").length;
    return { available, occupied, maintenance };
  }, [courts]);

  const toggleMaintenance = async (court: Court) => {
    const nextStatus: CourtStatus =
      court.status === "maintenance" ? "available" : "maintenance";

    setCourts((prev) =>
      prev.map((c) => (c.id === court.id ? { ...c, status: nextStatus } : c))
    );

    if (!isDemoMode) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        await updateCourtStatus(createClient(), court.id, nextStatus);
      } catch (err) {
        setCourts((prev) =>
          prev.map((c) =>
            c.id === court.id ? { ...c, status: court.status } : c
          )
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to update court status"
        );
        return;
      }
    }

    toast.success(
      nextStatus === "available"
        ? `${court.name} is back online`
        : `${court.name} marked under maintenance`
    );
  };

  const setSkillLevel = async (court: Court, skill: SkillLevel | "") => {
    if (!court.is_open_play) {
      toast.error("Only open-play courts can be tagged for skill queues");
      return;
    }

    const nextSkill = skill === "" ? null : skill;
    setCourts((prev) =>
      prev.map((c) =>
        c.id === court.id ? { ...c, skill_level: nextSkill } : c
      )
    );

    if (!isDemoMode) {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        await updateCourtSkillLevel(createClient(), court.id, nextSkill);
      } catch (err) {
        setCourts((prev) =>
          prev.map((c) =>
            c.id === court.id ? { ...c, skill_level: court.skill_level } : c
          )
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to update skill tag"
        );
        return;
      }
    }

    toast.success(
      nextSkill
        ? `${court.name} tagged as ${SKILL_LEVEL_LABELS[nextSkill]}`
        : `${court.name} skill tag cleared`
    );
  };

  return (
    <DashboardShell>
      <PageHeader
        title="Courts"
        description={
          isDemoMode
            ? "Sample courts for training. Sign in with your staff account to manage your club’s courts."
            : "Monitor court status, maintenance, and open-play skill tags."
        }
        actions={
          <Button onClick={() => toast.message("This action isn’t available yet")}>
            <Plus className="h-4 w-4" />
            Add Court
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatWidget title="Total Courts" value={courts.length} icon={Map} delay={0.05} />
        <StatWidget title="Available" value={stats.available} icon={CheckCircle2} delay={0.1} />
        <StatWidget title="Occupied" value={stats.occupied} icon={Users} delay={0.15} />
        <StatWidget title="Under Maintenance" value={stats.maintenance} icon={Wrench} delay={0.2} />
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading courts…
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courts.map((court, i) => (
            <motion.div
              key={court.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Card className="flex h-full flex-col overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{court.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {court.code ? `Code ${court.code}` : court.id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[court.status]}>
                    {court.status}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-background/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> Capacity
                      </p>
                      <p className="mt-1 font-semibold">
                        {court.capacity} players
                      </p>
                    </div>
                    <div className="rounded-2xl bg-background/50 p-3">
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Banknote className="h-3.5 w-3.5" /> Rate
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatCurrency(court.hourly_rate)}/hr
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    {court.is_exclusive ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" /> Exclusive
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Unlock className="h-3 w-3" /> Open Play
                      </Badge>
                    )}
                    {court.is_open_play ? (
                      <span className="text-xs text-muted-foreground">
                        Open play eligible
                      </span>
                    ) : null}
                  </div>

                  {court.is_open_play ? (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Skill Courts tag
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant={!court.skill_level ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => setSkillLevel(court, "")}
                        >
                          Untagged
                        </Button>
                        {SKILL_LEVELS.map((skill) => (
                          <Button
                            key={skill}
                            size="sm"
                            variant={
                              court.skill_level === skill ? "default" : "outline"
                            }
                            className="h-7 text-xs"
                            onClick={() => setSkillLevel(court, skill)}
                          >
                            {SKILL_LEVEL_LABELS[skill]}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {court.notes ? (
                    <p className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                      {court.notes}
                    </p>
                  ) : null}

                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      variant={
                        court.status === "maintenance" ? "default" : "outline"
                      }
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleMaintenance(court)}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      {court.status === "maintenance"
                        ? "Mark Available"
                        : "Set Maintenance"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toast.success(`Opened schedule for ${court.name}`)
                      }
                    >
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
