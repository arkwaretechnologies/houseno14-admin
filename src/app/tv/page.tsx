"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Monitor,
  Plus,
  ListOrdered,
  LayoutGrid,
  Megaphone,
  Radio,
  Handshake,
  Maximize2,
  RadioTower,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DEMO_TV } from "@/lib/demo-data";
import type { TvDisplay } from "@/types";

const LAYOUT_META: Record<TvDisplay["layout"], { label: string; icon: typeof Monitor }> = {
  queue: { label: "Queue Board", icon: ListOrdered },
  court_status: { label: "Court Status", icon: LayoutGrid },
  advertisement: { label: "Advertisement", icon: Megaphone },
  announcement: { label: "Announcement", icon: Radio },
  sponsor: { label: "Sponsor Wall", icon: Handshake },
};

export default function TvDisplaysPage() {
  const [displays, setDisplays] = useState<TvDisplay[]>(DEMO_TV);

  const toggleAutoRotate = (id: string) => {
    setDisplays((prev) =>
      prev.map((d) => (d.id === id ? { ...d, auto_rotate: !d.auto_rotate } : d))
    );
    toast.success("Display updated");
  };

  const handleCreate = () => {
    toast.success("New display created", {
      description: "Assign a layout and connect it to a screen to go live.",
    });
  };

  return (
    <DashboardShell>
      <PageHeader
        title="TV Display Manager"
        description="Configure lobby screens for queue boards, court status, sponsors, and announcements."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Add Display
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {displays.map((display, i) => {
          const meta = LAYOUT_META[display.layout];
          const Icon = meta.icon;
          return (
            <motion.div
              key={display.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{display.name}</p>
                        <p className="text-xs text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <Badge variant={display.is_active ? "success" : "secondary"}>
                      {display.is_active ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/50 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <RadioTower className="h-4 w-4 text-primary" />
                      Realtime sync
                    </div>
                    <Badge variant="outline" className="animate-pulse border-primary/40 text-primary">
                      Connected
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-background/50 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">Auto-rotate layouts</p>
                      <p className="text-xs text-muted-foreground">
                        Every {display.rotate_seconds}s
                      </p>
                    </div>
                    <Switch
                      checked={display.auto_rotate}
                      onCheckedChange={() => toggleAutoRotate(display.id)}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/tv/display/${display.id}`} target="_blank">
                        <Maximize2 className="h-4 w-4" />
                        Fullscreen Preview
                      </Link>
                    </Button>
                    <Button variant="soft" size="icon">
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </DashboardShell>
  );
}
