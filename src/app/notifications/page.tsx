"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bell,
  Send,
  Smartphone,
  Mail,
  MessageSquare,
  Megaphone,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_NOTIFICATIONS } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/utils";
import type { NotificationCampaign } from "@/types";

const CHANNEL_META: Record<
  NotificationCampaign["channel"],
  { label: string; icon: typeof Smartphone }
> = {
  push: { label: "Push", icon: Smartphone },
  email: { label: "Email", icon: Mail },
  sms: { label: "SMS", icon: MessageSquare },
  in_app: { label: "In-App", icon: Bell },
};

const AUDIENCE_OPTIONS = [
  "all",
  "specific",
  "vip",
  "queue",
  "reservation",
] as const satisfies readonly NotificationCampaign["audience"][];

const AUDIENCE_LABELS: Record<(typeof AUDIENCE_OPTIONS)[number], string> = {
  all: "All Players",
  specific: "Specific Players",
  vip: "VIP Players",
  queue: "In Queue",
  reservation: "Upcoming Reservations",
};

const STATUS_VARIANT: Record<
  NotificationCampaign["status"],
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  draft: "secondary",
  scheduled: "warning",
  sent: "success",
  failed: "destructive",
};

export default function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>(DEMO_NOTIFICATIONS);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<NotificationCampaign["channel"]>("push");
  const [audience, setAudience] =
    useState<(typeof AUDIENCE_OPTIONS)[number]>("all");

  const sendCampaign = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message body are required");
      return;
    }
    const campaign: NotificationCampaign = {
      id: `n${campaigns.length + 1}`,
      branch_id: null,
      title,
      body,
      channel,
      audience,
      status: "sent",
      scheduled_at: null,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    setCampaigns((prev) => [campaign, ...prev]);
    setTitle("");
    setBody("");
    toast.success("Notification sent", {
      description: `${CHANNEL_META[channel].label} campaign delivered to ${AUDIENCE_LABELS[audience].toLowerCase()}.`,
    });
  };

  const audienceLabel = (value: NotificationCampaign["audience"]) =>
    value in AUDIENCE_LABELS
      ? AUDIENCE_LABELS[value as (typeof AUDIENCE_OPTIONS)[number]]
      : value;

  return (
    <DashboardShell>
      <PageHeader
        title="Notifications"
        description="Compose and track push, email, and SMS campaigns to players."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notif-title">Title</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekend Tournament Reminder"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notif-body">Message</Label>
              <textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write your message…"
                className="flex w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Channel</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(CHANNEL_META) as NotificationCampaign["channel"][]).map((c) => {
                  const meta = CHANNEL_META[c];
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={c}
                      type="button"
                      size="sm"
                      variant={channel === c ? "default" : "outline"}
                      onClick={() => setChannel(c)}
                      className="flex-col gap-1 px-1"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[11px]">{meta.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map((a) => (
                  <Button
                    key={a}
                    type="button"
                    size="sm"
                    variant={audience === a ? "default" : "outline"}
                    onClick={() => setAudience(a)}
                    className="justify-start"
                  >
                    {AUDIENCE_LABELS[a]}
                  </Button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={sendCampaign}>
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3 xl:col-span-2">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                No campaigns yet.
              </CardContent>
            </Card>
          ) : (
            campaigns.map((c, i) => {
              const meta = CHANNEL_META[c.channel];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold">{c.title}</p>
                          <p className="mt-1 max-w-lg text-sm text-muted-foreground">{c.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {audienceLabel(c.audience)}
                            </span>
                            <span>·</span>
                            <span>
                              {c.sent_at
                                ? `Sent ${formatDateTime(c.sent_at)}`
                                : c.scheduled_at
                                  ? `Scheduled ${formatDateTime(c.scheduled_at)}`
                                  : "Draft"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                        <Badge variant="outline">{meta.label}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
