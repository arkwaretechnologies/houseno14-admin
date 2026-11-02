"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useAuthStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/shared/loading-skeletons";
import { setDemoCookie, clearDemoCookie } from "@/lib/demo-mode";
import { loadStaffSessionFromSupabase } from "@/lib/auth/staff-session";
import { toast } from "sonner";

export function DashboardShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const staff = useAuthStore((s) => s.staff);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const { sidebarCollapsed } = useUIStore();

  useEffect(() => {
    if (hasHydrated) return;

    // Prefer zustand persist API when available; always fall back so we never hang
    const persistApi = (
      useAuthStore as unknown as {
        persist?: {
          hasHydrated?: () => boolean;
          onFinishHydration?: (cb: () => void) => () => void;
        };
      }
    ).persist;

    const finish = () => useAuthStore.setState({ _hasHydrated: true });

    if (persistApi?.hasHydrated?.()) {
      finish();
      return;
    }

    const unsub = persistApi?.onFinishHydration?.(finish);
    const timeout = window.setTimeout(finish, 100);

    return () => {
      unsub?.();
      window.clearTimeout(timeout);
    };
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!staff) {
      clearDemoCookie();
      router.replace("/login");
      return;
    }

    if (isDemoMode) {
      setDemoCookie();
      return;
    }

    clearDemoCookie();

    let cancelled = false;

    async function verifyLiveSession() {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !user) {
          clearSession();
          router.replace("/login");
          toast.error("Session expired. Please sign in again.");
          return;
        }

        const session = await loadStaffSessionFromSupabase(
          supabase,
          user.id,
          user.email ?? ""
        );

        if (cancelled) return;

        if (!session) {
          await supabase.auth.signOut();
          clearSession();
          router.replace("/login");
          toast.error("This account is not authorized for the admin dashboard.");
          return;
        }

        setSession({
          staff: session.staff,
          branch: session.branch,
          isDemoMode: false,
        });
      } catch {
        if (!cancelled) {
          toast.error("Could not verify your session. Try signing in again.");
        }
      }
    }

    void verifyLiveSession();

    return () => {
      cancelled = true;
    };
  }, [staff, isDemoMode, hasHydrated, router, setSession, clearSession]);

  if (!hasHydrated || !staff) {
    return (
      <div className="min-h-screen p-6">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app">
      <AppSidebar />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-72"
        )}
      >
        <AppHeader title={title} subtitle={subtitle} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
