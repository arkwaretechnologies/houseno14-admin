"use client";

export type PiperVoiceId = "amy_low" | "ryan_high";

export const PIPER_VOICES: Record<
  PiperVoiceId,
  { label: string; modelId: string }
> = {
  amy_low: { label: "Amy (low)", modelId: "en_US-amy-low" },
  ryan_high: { label: "Ryan (high)", modelId: "en_US-ryan-high" },
};

const VOICE_KEY = "pv-tts-voice";
const MUTE_KEY = "pv-tts-muted";
const ENABLED_KEY = "pv-tts-enabled";

let currentAudio: HTMLAudioElement | null = null;
let enginePromise: Promise<unknown> | null = null;
const loadedVoices = new Set<string>();

/** Serial announcement chain — only one speak runs at a time. */
let announceChain: Promise<void> = Promise.resolve();

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getTtsVoice(): PiperVoiceId {
  if (!canUseStorage()) return "ryan_high";
  const raw = localStorage.getItem(VOICE_KEY);
  if (raw === "amy_low" || raw === "ryan_high") return raw;
  return "ryan_high";
}

export function setTtsVoice(voice: PiperVoiceId) {
  if (!canUseStorage()) return;
  localStorage.setItem(VOICE_KEY, voice);
}

export function isTtsMuted(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setTtsMuted(muted: boolean) {
  if (!canUseStorage()) return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

/** TV autoplay unlock — user must click Enable once. */
export function isTtsEnabled(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export function setTtsEnabled(enabled: boolean) {
  if (!canUseStorage()) return;
  localStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
}

export function joinPlayerNames(names: string[]): string {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) return "players";
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}, and ${cleaned[cleaned.length - 1]}`;
}

/**
 * Court-gated call script. Returns null if courtName is missing
 * (never announce without a real court).
 */
export function buildMatchAnnouncement(input: {
  courtName: string;
  teamA: string[];
  teamB: string[];
}): string | null {
  const court = input.courtName.trim();
  if (!court) return null;

  return `${joinPlayerNames(input.teamA)} versus ${joinPlayerNames(input.teamB)}. Please proceed to ${court}.`;
}

function stopPlayback() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}

function speakWithBrowserAndWait(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve();
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function playAudioAndWait(audio: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    void audio.play().catch(() => finish());
  });
}

async function getEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      // Native dynamic import from /public — avoids bundling the ~45MB package
      // which overflows webpack's parser/minifier during `next build`.
      const load = new Function(
        "return import('/piper-tts-web.js')"
      ) as () => Promise<typeof import("piper-tts-web")>;
      const mod = await load();
      return new mod.PiperWebEngine();
    })().catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

type LoadingCallback = (voiceLabel: string) => void;

type PiperEngine = {
  generate: (
    text: string,
    voice: string,
    speaker?: number
  ) => Promise<{ file: Blob }>;
};

export type MatchAnnounceInput = {
  id: string;
  courtName: string;
  teamA: string[];
  teamB: string[];
};

let preloadPromise: Promise<void> | null = null;

/**
 * Warm Piper engine + selected voice model without playing audio.
 * Populates browser HTTP cache so a new display tab starts faster.
 */
export async function preloadPiperVoice(opts?: {
  onLoading?: LoadingCallback;
}): Promise<void> {
  if (typeof window === "undefined") return;

  const voiceKey = getTtsVoice();
  const voice = PIPER_VOICES[voiceKey];
  const modelId = voice.modelId;

  if (loadedVoices.has(modelId) && enginePromise) return;

  if (!preloadPromise) {
    preloadPromise = (async () => {
      if (!loadedVoices.has(modelId)) {
        opts?.onLoading?.(voice.label);
      }

      const engine = (await getEngine()) as PiperEngine;
      const response = await engine.generate("Ready.", modelId, 0);
      loadedVoices.add(modelId);
      // Discard blob — warmup only, no playback
      void response.file;
    })().finally(() => {
      preloadPromise = null;
    });
  } else if (opts?.onLoading && !loadedVoices.has(modelId)) {
    opts.onLoading(voice.label);
  }

  await preloadPromise;
}

/**
 * Speak text with Piper (Amy/Ryan). Resolves when playback finishes.
 * Returns false if muted or skipped.
 */
export async function speakText(
  text: string,
  opts?: {
    requireEnabled?: boolean;
    onLoading?: LoadingCallback;
    /** When true (default for direct calls), stop any current audio first. */
    interrupt?: boolean;
  }
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (isTtsMuted()) return false;
  if (opts?.requireEnabled && !isTtsEnabled()) return false;

  const trimmed = text.trim();
  if (!trimmed) return false;

  if (opts?.interrupt !== false) {
    stopPlayback();
  }

  const voiceKey = getTtsVoice();
  const voice = PIPER_VOICES[voiceKey];
  const modelId = voice.modelId;

  try {
    if (!loadedVoices.has(modelId)) {
      opts?.onLoading?.(voice.label);
    }

    const engine = (await getEngine()) as PiperEngine;

    const response = await engine.generate(trimmed, modelId, 0);
    loadedVoices.add(modelId);

    const url = URL.createObjectURL(response.file);
    const audio = new Audio(url);
    currentAudio = audio;
    await playAudioAndWait(audio, url);
    return true;
  } catch {
    await speakWithBrowserAndWait(trimmed);
    return true;
  }
}

export async function speakMatchAnnouncement(
  input: {
    courtName: string;
    teamA: string[];
    teamB: string[];
  },
  opts?: {
    requireEnabled?: boolean;
    onLoading?: LoadingCallback;
    interrupt?: boolean;
  }
): Promise<boolean> {
  const text = buildMatchAnnouncement(input);
  if (!text) return false;
  return speakText(text, opts);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enqueue match announcements to play one-by-one.
 * Items without a court name are skipped (court-gated).
 * Optional onStart/onComplete drive the focused VS overlay.
 */
export function enqueueMatchAnnouncements(
  items: MatchAnnounceInput[],
  opts?: {
    requireEnabled?: boolean;
    onLoading?: LoadingCallback;
    onStart?: (item: MatchAnnounceInput) => void;
    onItemDone?: (item: MatchAnnounceInput) => void;
    onQueueDone?: () => void;
    pauseBetweenMs?: number;
  }
): Promise<void> {
  const unique = items.filter((item, index, arr) => {
    if (!item.courtName?.trim()) return false;
    return arr.findIndex((x) => x.id === item.id) === index;
  });

  if (unique.length === 0) return Promise.resolve();

  const run = async () => {
    for (const item of unique) {
      opts?.onStart?.(item);
      await speakMatchAnnouncement(
        {
          courtName: item.courtName,
          teamA: item.teamA,
          teamB: item.teamB,
        },
        {
          requireEnabled: opts?.requireEnabled,
          onLoading: opts?.onLoading,
          interrupt: false,
        }
      );
      opts?.onItemDone?.(item);
      await delay(opts?.pauseBetweenMs ?? 800);
    }
    opts?.onQueueDone?.();
  };

  announceChain = announceChain.then(run, run);
  return announceChain;
}
