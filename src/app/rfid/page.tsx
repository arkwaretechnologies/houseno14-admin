"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { motion } from "framer-motion";
import {
  ScanLine,
  ShieldAlert,
  Radio,
  RefreshCw,
  Ban,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DEMO_MEMBERS, DEMO_RFID_SCANS } from "@/lib/demo-data";
import { formatDateTime, getInitials } from "@/lib/utils";
import type { Member, RfidScanLog } from "@/types";

const RESULT_VARIANT: Record<RfidScanLog["result"], "success" | "destructive" | "warning" | "secondary"> = {
  success: "success",
  unknown: "destructive",
  inactive: "secondary",
  duplicate: "warning",
};

export default function RfidPage() {
  const [scans] = useState<RfidScanLog[]>(DEMO_RFID_SCANS);
  const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
  const [tagInput, setTagInput] = useState("");
  const [memberQuery, setMemberQuery] = useState("");

  const matchedMember = useMemo(
    () =>
      members.find((m) =>
        m.full_name.toLowerCase().includes(memberQuery.trim().toLowerCase())
      ),
    [members, memberQuery]
  );

  const handleAssign = () => {
    if (!tagInput.trim() || !matchedMember) {
      toast.error("Enter a tag UID and select a valid member");
      return;
    }
    const duplicate = members.some(
      (m) => m.rfid_tag === tagInput.trim() && m.id !== matchedMember.id
    );
    if (duplicate) {
      toast.error("This RFID tag is already assigned to another member");
      return;
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.id === matchedMember.id ? { ...m, rfid_tag: tagInput.trim() } : m
      )
    );
    toast.success(`RFID ${tagInput.trim()} assigned to ${matchedMember.full_name}`);
    setTagInput("");
    setMemberQuery("");
  };

  const handleReplace = (member: Member) => {
    const newTag = `RFID-${Math.floor(10000 + Math.random() * 89999)}`;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, rfid_tag: newTag } : m))
    );
    toast.success(`${member.full_name}'s tag replaced with ${newTag}`);
  };

  const handleDeactivate = (member: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, rfid_tag: null } : m))
    );
    toast.error(`Deactivated RFID for ${member.full_name}`);
  };

  const columns: ColumnDef<Member, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "full_name",
        header: "Member",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(row.original.full_name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.original.full_name}</span>
          </div>
        ),
      },
      {
        accessorKey: "rfid_tag",
        header: "RFID Tag",
        cell: ({ row }) =>
          row.original.rfid_tag ? (
            <Badge variant="outline" className="font-mono">
              {row.original.rfid_tag}
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Lost / Unassigned
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                row.original.rfid_tag
                  ? handleReplace(row.original)
                  : toast.error("Assign a tag first from the panel above")
              }
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Replace
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeactivate(row.original)}
              disabled={!row.original.rfid_tag}
            >
              <Ban className="h-3.5 w-3.5 text-destructive" />
              Deactivate
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const scanColumns: ColumnDef<RfidScanLog, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "tag_uid",
        header: "Tag UID",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.tag_uid}</span>
        ),
      },
      {
        id: "member",
        header: "Member",
        accessorFn: (row) => row.member?.full_name ?? "",
        cell: ({ row }) => row.original.member?.full_name ?? (
          <span className="text-muted-foreground">Unknown tag</span>
        ),
      },
      {
        accessorKey: "scanner_id",
        header: "Scanner",
      },
      {
        accessorKey: "result",
        header: "Result",
        cell: ({ row }) => (
          <Badge variant={RESULT_VARIANT[row.original.result]}>{row.original.result}</Badge>
        ),
      },
      {
        accessorKey: "scanned_at",
        header: "Time",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.scanned_at)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <DashboardShell>
      <PageHeader
        title="RFID Management"
        description="Assign, replace, and monitor RFID access tags in real time."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Assign RFID Tag
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Tag UID
              </label>
              <Input
                placeholder="Scan or type tag UID…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Member
              </label>
              <Input
                placeholder="Search member by name…"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
              />
              {memberQuery && matchedMember ? (
                <p className="text-xs text-emerald-600">
                  Matched: {matchedMember.full_name}
                </p>
              ) : null}
            </div>
            <Button className="w-full" onClick={handleAssign}>
              <ScanLine className="h-4 w-4" />
              Assign Tag
            </Button>
            <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Duplicate prevention is enforced — a tag UID already linked to
                another active member cannot be reassigned until deactivated.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Radio className="h-4 w-4 text-primary" />
              Live Scan Log
            </h3>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live
            </motion.div>
          </div>
          <DataTable
            columns={scanColumns}
            data={scans}
            searchPlaceholder="Search scans…"
            emptyTitle="No scans yet"
            emptyDescription="RFID scan activity will appear here in real time."
          />
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold tracking-tight">
          Member RFID Directory
        </h3>
        <DataTable
          columns={columns}
          data={members}
          searchKey="full_name"
          searchPlaceholder="Search members…"
          emptyTitle="No members"
        />
      </div>
    </DashboardShell>
  );
}
