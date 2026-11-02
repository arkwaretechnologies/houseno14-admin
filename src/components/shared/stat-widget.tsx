"use client";

import { motion } from "framer-motion";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatWidget({
  title,
  value,
  hint,
  icon: Icon,
  trend,
  currency,
  className,
  delay = 0,
}: {
  title: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  trend?: { value: number; label?: string };
  currency?: boolean;
  className?: string;
  delay?: number;
}) {
  const display =
    typeof value === "number"
      ? currency
        ? formatCurrency(value)
        : formatNumber(value)
      : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="relative p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                {display}
              </p>
              {hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              ) : null}
              {trend ? (
                <p
                  className={cn(
                    "mt-2 text-xs font-medium",
                    trend.value >= 0 ? "text-emerald-600" : "text-rose-500"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}% {trend.label ?? "vs yesterday"}
                </p>
              ) : null}
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
