"use client";

import { useMemo, useState } from "react";
import { Loader2, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES, ROLE_LABELS, type StaffRole } from "@/lib/constants";
import type { StaffProfile } from "@/types";

type Mode = "create" | "invite";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  admin_role: "receptionist" as StaffRole,
};

export function AddStaffDialog({
  open,
  onOpenChange,
  branchId,
  actorRole,
  isDemoMode,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string | null | undefined;
  actorRole: StaffRole | null;
  isDemoMode: boolean;
  onCreated: (staff: StaffProfile) => void;
}) {
  const [mode, setMode] = useState<Mode>("create");
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const assignableRoles = useMemo(() => {
    if (actorRole === "super_admin") return ROLES;
    if (actorRole === "manager") {
      return ROLES.filter((r) => !["super_admin", "manager"].includes(r));
    }
    return ROLES;
  }, [actorRole]);

  const reset = () => {
    setForm(EMPTY);
    setMode("create");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    if (mode === "create" && form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const staff: StaffProfile = {
          id,
          auth_user_id: id,
          branch_id: branchId,
          email: form.email.trim(),
          full_name: form.full_name.trim(),
          role: form.admin_role,
          avatar_url: null,
          phone: form.phone.trim() || null,
          is_active: true,
          last_login_at: null,
          created_at: now,
          updated_at: now,
        };
        onCreated(staff);
        toast.success(
          mode === "invite"
            ? "Invitation sent (sample data)"
            : "Staff member added (sample data)",
          {
            description:
              mode === "invite"
                ? `${staff.email} would receive an email to set their password.`
                : `${staff.full_name} can sign in with the password you set.`,
          }
        );
        handleOpenChange(false);
        return;
      }

      const payload =
        mode === "create"
          ? {
              mode: "create" as const,
              full_name: form.full_name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              admin_role: form.admin_role,
              branch_id: branchId,
              password: form.password,
            }
          : {
              mode: "invite" as const,
              full_name: form.full_name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim() || undefined,
              admin_role: form.admin_role,
              branch_id: branchId,
            };

      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as {
        data?: StaffProfile;
        error?: string | Record<string, string[]>;
        message?: string;
      };

      if (!res.ok) {
        const err = json.error;
        if (typeof err === "string") throw new Error(err);
        if (err && typeof err === "object") {
          const first = Object.values(err).flat()[0];
          throw new Error(first ?? "Request failed");
        }
        throw new Error("Request failed");
      }

      if (json.data) onCreated(json.data);
      toast.success(json.message ?? "Staff added");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add staff");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
          <DialogDescription>
            Create an account now or send an email invitation to join the admin
            dashboard.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="gap-1.5">
              <UserPlus className="h-3.5 w-3.5" />
              Create account
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Invite by email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Adds the user to Supabase Auth and creates their staff profile.
              Share the password securely with them.
            </p>
          </TabsContent>
          <TabsContent value="invite" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Sends a Supabase invitation email so they can set a password and
              sign in.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="staff-name">Full name</Label>
            <Input
              id="staff-name"
              value={form.full_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, full_name: e.target.value }))
              }
              placeholder="Alex Rivera"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="staff@yourclub.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-phone">Phone (optional)</Label>
            <Input
              id="staff-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="+63 917 000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.admin_role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  admin_role: e.target.value as StaffRole,
                }))
              }
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {mode === "create" ? (
            <div className="space-y-1.5">
              <Label htmlFor="staff-password">Temporary password</Label>
              <Input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {mode === "invite" ? "Send invitation" : "Create staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
