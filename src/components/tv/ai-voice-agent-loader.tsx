"use client";

import { motion } from "framer-motion";
import { BrandMark } from "@/components/shared/brand-mark";

export function AiVoiceAgentLoader({
  progress,
  status = "loading",
}: {
  /** 0–100 */
  progress: number;
  status?: "loading" | "error";
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#040b07] text-white">
      <div className="pointer-events-none absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-emerald-500/25 blur-[140px]" />
      <div className="pointer-events-none absolute -right-24 bottom-[-15%] h-[480px] w-[480px] rounded-full bg-emerald-400/15 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex w-full max-w-md flex-col items-center px-8"
      >
        <BrandMark size="lg" className="mb-8 shadow-2xl shadow-emerald-500/40" />

        <p className="font-[family-name:var(--font-display)] text-center text-2xl font-semibold tracking-tight md:text-3xl">
          {status === "error" ? "Voice agent unavailable" : "Loading AI Voice Agent"}
        </p>
        <p className="mt-2 text-center text-sm text-white/50">
          {status === "error"
            ? "Announcements may use a fallback voice."
            : "Preparing match callouts…"}
        </p>

        <div className="mt-10 w-full">
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-amber-300"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs tabular-nums text-white/45">
            <span>{status === "error" ? "Continuing" : "Initializing"}</span>
            <span>{pct}%</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
