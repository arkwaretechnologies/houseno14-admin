"use client";

import { Menu, Moon, Sun, Bell, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore, useUIStore } from "@/store";
import { Badge } from "@/components/ui/badge";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const { setMobileSidebarOpen } = useUIStore();
  const { branch, isDemoMode } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/55 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu />
        </Button>

        <div className="min-w-0 flex-1">
          {title ? (
            <div>
              <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          ) : (
            <div className="relative hidden max-w-md md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search members, bookings, RFID…" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {branch ? (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {branch.name}
            </Badge>
          ) : null}
          {isDemoMode ? <Badge variant="warning">Sample data</Badge> : null}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
    </header>
  );
}
