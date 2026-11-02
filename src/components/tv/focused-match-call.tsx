"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

export type FocusedMatchCallData = {
  id: string;
  courtName: string;
  teamA: string[];
  teamB: string[];
  label?: string;
};

function NameStack({ names, side }: { names: string[]; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:gap-5",
        side === "left" ? "items-end text-right" : "items-start text-left"
      )}
    >
      {names.length === 0 ? (
        <p className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-white/80 md:text-6xl lg:text-7xl">
          —
        </p>
      ) : (
        names.map((name, i) => (
          <motion.p
            key={`${name}-${i}`}
            initial={{ opacity: 0, x: side === "left" ? -48 : 48, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 20,
              delay: 0.12 + i * 0.08,
            }}
            className="font-[family-name:var(--font-display)] text-4xl font-bold leading-none tracking-tight text-white drop-shadow-[0_0_24px_rgba(52,211,153,0.35)] md:text-6xl lg:text-7xl xl:text-8xl"
          >
            {name}
          </motion.p>
        ))
      )}
    </div>
  );
}

export function FocusedMatchCall({
  match,
}: {
  match: FocusedMatchCallData | null;
}) {
  return (
    <AnimatePresence>
      {match ? (
        <motion.div
          key={match.id}
          className="fixed inset-0 z-50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Atmosphere */}
          <div
            className="absolute inset-0 bg-[#040b07]"
            style={{
              backgroundImage: "url(/tv/court-atmosphere.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

          {/* Side flares */}
          <img
            src="/tv/side-flare-left.png"
            alt=""
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[38%] object-cover opacity-55"
          />
          <img
            src="/tv/side-flare-right.png"
            alt=""
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-[38%] object-cover opacity-55"
          />

          {/* Color washes */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-emerald-500/20 via-emerald-500/5 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-500/20 via-amber-500/5 to-transparent" />

          <div className="relative z-10 flex h-full flex-col px-8 py-8 md:px-14 md:py-10">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-center"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300/90 md:text-base">
                {`${BRAND_NAME} · Now Calling`}
              </p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-white/90 md:text-3xl">
                {match.courtName}
              </p>
            </motion.div>

            <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8">
              <NameStack names={match.teamA} side="left" />

              <div className="relative flex flex-col items-center justify-center px-2">
                <motion.img
                  src="/tv/vs-mark-transparent.png"
                  alt="VS"
                  initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.2 }}
                  className="h-28 w-28 object-contain mix-blend-screen drop-shadow-[0_0_40px_rgba(251,191,36,0.45)] md:h-40 md:w-40 lg:h-48 lg:w-48"
                />
                <motion.img
                  src="/tv/pickleball-orb-transparent.png"
                  alt=""
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45, type: "spring", stiffness: 200 }}
                  className="mt-2 h-10 w-10 object-contain opacity-90 mix-blend-screen md:h-14 md:w-14"
                />
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className="mt-4 text-xs font-bold uppercase tracking-[0.4em] text-amber-300/80"
                >
                  vs
                </motion.p>
              </div>

              <NameStack names={match.teamB} side="right" />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center text-sm text-white/45 md:text-base"
            >
              Please proceed to {match.courtName}
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
