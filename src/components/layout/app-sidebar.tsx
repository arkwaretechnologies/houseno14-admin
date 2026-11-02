"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Users,
  BadgeCheck,
  CreditCard,
  UserCheck,
  Map,
  CalendarDays,
  CalendarClock,
  ListOrdered,
  Swords,
  Trophy,
  Medal,
  Monitor,
  Bell,
  TicketPercent,
  Wallet,
  Package,
  ShoppingBag,
  Tags,
  FileBarChart,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { NAV_ITEMS, HIDDEN_NAV_MODULES, canAccessModule } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import { useAuthStore, useUIStore } from "@/store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";

const ICONS = {
  LayoutDashboard,
  BarChart3,
  Sparkles,
  Users,
  BadgeCheck,
  CreditCard,
  UserCheck,
  Map,
  CalendarDays,
  CalendarClock,
  ListOrdered,
  Swords,
  Trophy,
  Medal,
  Monitor,
  Bell,
  TicketPercent,
  Wallet,
  Package,
  ShoppingBag,
  Tags,
  FileBarChart,
  Shield,
  Settings,
} as const;

const GROUPS = [
  { key: "overview", label: "Overview" },
  { key: "operations", label: "Operations" },
  { key: "engagement", label: "Engagement" },
  { key: "commerce", label: "Commerce" },
  { key: "system", label: "System" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, role, clearSession, isDemoMode } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } =
    useUIStore();

  const items = NAV_ITEMS.filter(
    (item) =>
      !HIDDEN_NAV_MODULES.has(item.module) && canAccessModule(role, item.module)
  );

  const logout = () => {
    clearSession();
    router.push("/login");
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden",
          mobileSidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/15 bg-sidebar/80 backdrop-blur-2xl transition-all duration-300 dark:border-white/10",
          sidebarCollapsed ? "w-[88px]" : "w-72",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark size="sm" className="h-11 w-11 rounded-2xl shadow-lg shadow-primary/30" />
          {!sidebarCollapsed ? (
            <div className="min-w-0">
              <BrandMark
                variant="wordmark"
                wordmarkClassName="block truncate text-sm"
              />
              <p className="truncate text-xs text-muted-foreground">Admin Console</p>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {GROUPS.map((group) => {
            const groupItems = items.filter((i) => i.group === group.key);
            if (!groupItems.length) return null;
            return (
              <div key={group.key} className="mb-4">
                {!sidebarCollapsed ? (
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-1">
                  {groupItems.map((item) => {
                    const Icon = ICONS[item.icon as keyof typeof ICONS];
                    const matches =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const hasMoreSpecificMatch = groupItems.some(
                      (other) =>
                        other.href !== item.href &&
                        other.href.length > item.href.length &&
                        other.href.startsWith(`${item.href}/`) &&
                        (pathname === other.href ||
                          pathname.startsWith(`${other.href}/`))
                    );
                    const active = matches && !hasMoreSpecificMatch;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all",
                          active
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {active ? (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-2xl bg-primary/10"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        ) : null}
                        <Icon className="relative z-10 h-4 w-4 shrink-0" />
                        {!sidebarCollapsed ? (
                          <span className="relative z-10 truncate font-medium">
                            {item.title}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-border/60 p-3">
          {!sidebarCollapsed && staff ? (
            <div className="mb-3 flex items-center gap-3 rounded-2xl bg-background/40 p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{getInitials(staff.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{staff.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {ROLE_LABELS[staff.role]}
                  {isDemoMode ? " · Sample" : ""}
                </p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </Button>
            <Button variant="outline" className="flex-1" onClick={logout}>
              <LogOut className="h-4 w-4" />
              {!sidebarCollapsed ? "Sign out" : null}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
