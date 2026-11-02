"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { DEMO_BRANCHES } from "@/lib/demo-data";
import { listBranches } from "@/services/branches";
import { useAuthStore } from "@/store";
import type { Branch } from "@/types";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-10 min-w-[10rem] max-w-[16rem] rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export function BranchSelect({
  id = "branch-select",
  className,
  showLabel = true,
}: {
  id?: string;
  className?: string;
  showLabel?: boolean;
}) {
  const { branch, setBranch, isDemoMode } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>(
    isDemoMode ? DEMO_BRANCHES : []
  );
  const [loading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isDemoMode) {
        if (!cancelled) {
          setBranches(DEMO_BRANCHES);
          setLoading(false);
          if (!branch || !DEMO_BRANCHES.some((b) => b.id === branch.id)) {
            setBranch(DEMO_BRANCHES[0] ?? null);
          }
        }
        return;
      }

      setLoading(true);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const rows = await listBranches(supabase);
        if (cancelled) return;
        setBranches(rows);
        if (rows.length > 0) {
          const stillValid = branch && rows.some((b) => b.id === branch.id);
          if (!stillValid) {
            setBranch(rows[0]);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load branches";
        toast.error(message);
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {showLabel ? (
        <Label htmlFor={id} className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Branch
        </Label>
      ) : null}
      <select
        id={id}
        className={selectClassName}
        value={branch?.id ?? ""}
        disabled={loading || branches.length === 0}
        onChange={(e) => {
          const next = branches.find((b) => b.id === e.target.value) ?? null;
          setBranch(next);
        }}
      >
        {branches.length === 0 ? (
          <option value="">
            {loading ? "Loading branches…" : "No branches"}
          </option>
        ) : (
          branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))
        )}
      </select>
    </div>
  );
}
