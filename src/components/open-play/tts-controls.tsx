"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getTtsVoice,
  isTtsEnabled,
  isTtsMuted,
  PIPER_VOICES,
  preloadPiperVoice,
  setTtsEnabled,
  setTtsMuted,
  setTtsVoice,
  type PiperVoiceId,
} from "@/lib/tts/piper";
import { cn } from "@/lib/utils";

export function TtsControls({
  className,
  variant = "admin",
  showEnable = false,
}: {
  className?: string;
  variant?: "admin" | "tv";
  /** TV surfaces often need a one-time gesture to unlock audio. */
  showEnable?: boolean;
}) {
  const [muted, setMuted] = useState(false);
  const [voice, setVoice] = useState<PiperVoiceId>("ryan_high");
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMuted(isTtsMuted());
    setVoice(getTtsVoice());
    setEnabled(isTtsEnabled());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    void preloadPiperVoice().catch(() => {
      /* background warm — announce path still works */
    });
  }, [hydrated, enabled]);

  if (!hydrated) return null;

  const isTv = variant === "tv";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        isTv && "text-white",
        className
      )}
    >
      {showEnable && !enabled ? (
        <Button
          type="button"
          size="sm"
          variant={isTv ? "outline" : "default"}
          className={cn(
            isTv &&
              "border-emerald-400/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
          )}
          onClick={() => {
            setTtsEnabled(true);
            setEnabled(true);
            setTtsMuted(false);
            setMuted(false);
            void preloadPiperVoice().catch(() => {
              /* background warm after enable gesture */
            });
          }}
        >
          <Volume2 className="h-4 w-4" />
          Enable announcements
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        variant={muted ? "outline" : "secondary"}
        className={cn(
          isTv &&
            (muted
              ? "border-white/20 bg-white/5 text-white/70"
              : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200")
        )}
        onClick={() => {
          const next = !muted;
          setTtsMuted(next);
          setMuted(next);
        }}
        title={muted ? "Unmute announcements" : "Mute announcements"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        {muted ? "Muted" : "Voice on"}
      </Button>

      <div className="flex items-center gap-2">
        <Label
          htmlFor="tts-voice"
          className={cn("text-xs", isTv ? "text-white/60" : "text-muted-foreground")}
        >
          Voice
        </Label>
        <select
          id="tts-voice"
          className={cn(
            "h-8 rounded-md border px-2 text-xs",
            isTv
              ? "border-white/20 bg-black/40 text-white"
              : "border-input bg-background"
          )}
          value={voice}
          onChange={(e) => {
            const next = e.target.value as PiperVoiceId;
            setTtsVoice(next);
            setVoice(next);
          }}
        >
          {(Object.keys(PIPER_VOICES) as PiperVoiceId[]).map((id) => (
            <option key={id} value={id}>
              {PIPER_VOICES[id].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
