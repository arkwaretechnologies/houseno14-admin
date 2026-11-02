"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useAuthStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/shared/loading-skeletons";
import { setDemoCookie, clearDemoCookie } from "@/lib/demo-mode";

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
    } else {
      clearDemoCookie();
    }
  }, [staff, isDemoMode, hasHydrated, router]);

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
