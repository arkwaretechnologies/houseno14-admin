"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  type SkillLevel,
} from "@/lib/constants";
import type { OpenPlayPlayer } from "@/types";
import {
  createPlayer,
  deletePlayer,
  searchPlayers,
  updatePlayer,
  type PlayerInput,
} from "@/services/players";

const GENDERS = ["male", "female"] as const;
type Gender = (typeof GENDERS)[number];

const PAGE_SIZES = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const selectClassName =
  "flex h-10 w-full rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-sm shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const pageSizeSelectClassName =
  "flex h-8 rounded-lg border border-border/70 bg-background/50 px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

type PlayerFormState = {
  fullName: string;
  gender: Gender;
  skillLevel: SkillLevel;
  address: string;
  phone: string;
  email: string;
};

const emptyForm = (): PlayerFormState => ({
  fullName: "",
  gender: "male",
  skillLevel: "intermediate",
  address: "",
  phone: "",
  email: "",
});

function toInput(form: PlayerFormState): PlayerInput {
  return {
    fullName: form.fullName.trim(),
    gender: form.gender,
    skillLevel: form.skillLevel,
    address: form.address.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
  };
}

function fromPlayer(player: OpenPlayPlayer): PlayerFormState {
  return {
    fullName: player.full_name,
    gender: player.gender,
    skillLevel: (player.skill_level as SkillLevel) || "intermediate",
    address: player.address ?? "",
    phone: player.phone ?? "",
    email: player.email ?? "",
  };
}

export function PlayerManager({
  branchId,
  isDemoMode,
  demoPlayers,
  onDemoPlayersChange,
  actionLabel,
  onSelectPlayer,
  disabled,
  excludedPlayerIds,
  excludedActionLabel = "On schedule",
}: {
  branchId: string | null | undefined;
  isDemoMode: boolean;
  demoPlayers: OpenPlayPlayer[];
  onDemoPlayersChange: (players: OpenPlayPlayer[]) => void;
  actionLabel: string;
  onSelectPlayer: (player: OpenPlayPlayer) => Promise<void> | void;
  disabled?: boolean;
  excludedPlayerIds?: Iterable<string>;
  excludedActionLabel?: string;
}) {
  const excludedIds = useMemo(
    () => new Set(excludedPlayerIds ?? []),
    [excludedPlayerIds]
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpenPlayPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [listVersion, setListVersion] = useState(0);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const searchSeq = useRef(0);

  const filteredDemo = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = demoPlayers.filter((p) => !p.deleted_at);
    if (!q) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [demoPlayers, query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const reloadList = (opts?: { page?: number }) => {
    if (opts?.page != null) setPage(opts.page);
    setListVersion((v) => v + 1);
  };

  const removeFromResults = (playerId: string) => {
    setResults((prev) => prev.filter((p) => p.id !== playerId));
    setTotal((t) => Math.max(0, t - 1));
  };

  useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    if (isDemoMode) {
      const pages = Math.max(1, Math.ceil(filteredDemo.length / pageSize));
      if (page > pages) {
        setPage(pages);
        return;
      }
      const start = (page - 1) * pageSize;
      setTotal(filteredDemo.length);
      setResults(filteredDemo.slice(start, start + pageSize));
      return;
    }

    if (!branchId) {
      setResults([]);
      setTotal(0);
      return;
    }

    let cancelled = false;
    const seq = ++searchSeq.current;
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const result = await searchPlayers(supabase, branchId, query, {
            page,
            pageSize,
          });
          if (!cancelled && seq === searchSeq.current) {
            setResults(result.players);
            setTotal(result.total);
            if (page > result.totalPages) setPage(result.totalPages);
          }
        } catch (err) {
          if (!cancelled && seq === searchSeq.current) {
            const message =
              err instanceof Error ? err.message : "Failed to search players";
            toast.error(message);
          }
        } finally {
          if (!cancelled && seq === searchSeq.current) setSearching(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [isDemoMode, branchId, query, page, pageSize, filteredDemo, listVersion]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (player: OpenPlayPlayer) => {
    setEditingId(player.id);
    setForm(fromPlayer(player));
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) resetForm();
  };

  const savePlayer = async () => {
    const input = toInput(form);
    if (!input.fullName) {
      toast.error("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        if (editingId) {
          onDemoPlayersChange(
            demoPlayers.map((p) =>
              p.id === editingId
                ? {
                    ...p,
                    full_name: input.fullName,
                    gender: input.gender,
                    skill_level: input.skillLevel,
                    address: input.address ?? null,
                    phone: input.phone ?? null,
                    email: input.email ?? null,
                    updated_at: new Date().toISOString(),
                  }
                : p
            )
          );
          toast.success("Player updated");
        } else {
          const now = new Date().toISOString();
          const created: OpenPlayPlayer = {
            id: `player-${Date.now()}`,
            branch_id: branchId ?? "branch-1",
            full_name: input.fullName,
            gender: input.gender,
            skill_level: input.skillLevel,
            address: input.address ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          onDemoPlayersChange([created, ...demoPlayers]);
          toast.success("Player created");
        }
        handleFormOpenChange(false);
        return;
      }

      if (!branchId) {
        toast.error("Select a branch first");
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (editingId) {
        await updatePlayer(supabase, editingId, input);
        toast.success("Player updated");
      } else {
        await createPlayer(supabase, branchId, input);
        toast.success("Player created");
      }
      handleFormOpenChange(false);
      reloadList(editingId ? undefined : { page: 1 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save player";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const removePlayer = async (player: OpenPlayPlayer) => {
    setBusyId(player.id);
    try {
      if (isDemoMode) {
        removeFromResults(player.id);
        onDemoPlayersChange(
          demoPlayers.filter((p) => p.id !== player.id)
        );
        toast.success("Player deleted");
        if (editingId === player.id) handleFormOpenChange(false);
        return;
      }

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await deletePlayer(supabase, player.id);
      removeFromResults(player.id);
      toast.success("Player deleted");
      if (editingId === player.id) handleFormOpenChange(false);
      reloadList();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete player";
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  };

  const selectPlayer = async (player: OpenPlayPlayer) => {
    setBusyId(player.id);
    try {
      await onSelectPlayer(player);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="player-search" className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Players
        </Label>
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="player-search"
              className="pl-9"
              placeholder="Search players by name, contact, or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Separator orientation="vertical" className="h-8 shrink-0" />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={openCreate}
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            Create player
          </Button>
        </div>
        {searching ? (
          <p className="text-xs text-muted-foreground">Searching…</p>
        ) : null}
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
          {results.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No players found. Create a new player.
            </p>
          ) : (
            results.map((player) => (
              <div
                key={player.id}
                className="flex flex-col gap-2 rounded-lg px-2 py-1.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {player.full_name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      Player
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {player.gender === "male" ? "Male" : "Female"} ·{" "}
                    {SKILL_LEVEL_LABELS[player.skill_level as SkillLevel] ??
                      player.skill_level}
                    {player.phone ? ` · ${player.phone}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={excludedIds.has(player.id) ? "outline" : "default"}
                    disabled={
                      disabled ||
                      busyId === player.id ||
                      excludedIds.has(player.id)
                    }
                    onClick={() => void selectPlayer(player)}
                  >
                    {busyId === player.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    {excludedIds.has(player.id)
                      ? excludedActionLabel
                      : actionLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === player.id}
                    onClick={() => openEdit(player)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === player.id}
                    onClick={() => void removePlayer(player)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {total === 0
                ? "0 players"
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <label className="flex items-center gap-1.5">
              <span>Rows</span>
              <select
                className={pageSizeSelectClassName}
                value={pageSize}
                onChange={(e) =>
                  setPageSize(Number(e.target.value) as PageSize)
                }
                aria-label="Players per page"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Page {Math.min(page, totalPages)} of {totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || searching}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || searching}
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={handleFormOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit player" : "Create player"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update this player’s details."
                : "Name, gender, and skill level are required."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="player-name">Name *</Label>
              <Input
                id="player-name"
                value={form.fullName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fullName: e.target.value }))
                }
                placeholder="Player full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="player-gender">Gender *</Label>
              <select
                id="player-gender"
                className={selectClassName}
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value as Gender }))
                }
              >
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g === "male" ? "Male" : "Female"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="player-skill">Skill level *</Label>
              <select
                id="player-skill"
                className={selectClassName}
                value={form.skillLevel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    skillLevel: e.target.value as SkillLevel,
                  }))
                }
              >
                {SKILL_LEVELS.map((skill) => (
                  <option key={skill} value={skill}>
                    {SKILL_LEVEL_LABELS[skill]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="player-address">Address</Label>
              <Input
                id="player-address"
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="player-phone">Contact No.</Label>
              <Input
                id="player-phone"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="player-email">Email Address</Label>
              <Input
                id="player-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleFormOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void savePlayer()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingId ? "Save changes" : "Create player"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
