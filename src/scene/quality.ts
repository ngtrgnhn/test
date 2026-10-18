import { create } from "zustand";
import type { QualityPref } from "../config";

/**
 * Three quality tiers. The page starts on the tier that suits the device, and — only when the
 * author did not pin one — steps down by itself if the frame rate stays low (see PerfGuard).
 *
 * Pin a tier:   ?q=high | medium | low   (URL)    or   "scene": { "quality": "high" }  (config.json)
 */
export type Tier = "high" | "medium" | "low";

export interface Profile {
  tier: Tier;
  dpr: [number, number];
  bloom: boolean;
  bloomStrength: number;
  msaa: number;          // samples of the post-processing render target
  shadows: boolean;
  shadowMap: number;
  confetti: number;      // multiplier on particle counts
  burst: number;         // size of the confetti-cannon pool
  glitter: number;
  fancy: boolean;        // extra modelling detail (rosettes, pleats, fairy bulbs…)
  texture: number;       // size of the big painted textures
}

export const PROFILES: Record<Tier, Profile> = {
  high: {
    tier: "high", dpr: [1, 1.75], bloom: true, bloomStrength: 0.7, msaa: 4,
    shadows: true, shadowMap: 2048, confetti: 1, burst: 480, glitter: 1, fancy: true, texture: 2048,
  },
  medium: {
    tier: "medium", dpr: [1, 1.5], bloom: true, bloomStrength: 0.62, msaa: 2,
    shadows: true, shadowMap: 1024, confetti: 0.6, burst: 280, glitter: 0.6, fancy: true, texture: 1024,
  },
  low: {
    tier: "low", dpr: [0.8, 1], bloom: false, bloomStrength: 0, msaa: 0,
    shadows: false, shadowMap: 512, confetti: 0.32, burst: 140, glitter: 0.3, fancy: false, texture: 1024,
  },
};

const ORDER: Tier[] = ["high", "medium", "low"];

function urlTier(): Tier | null {
  try {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q === "high" || q === "medium" || q === "low") return q;
  } catch {
    /* no window */
  }
  return null;
}

function detectTier(): Tier {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number };
    const mem = nav.deviceMemory ?? 8;
    const cores = nav.hardwareConcurrency ?? 8;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const small = Math.min(window.screen.width, window.screen.height) < 700;
    if (mem <= 2 || cores <= 2) return "low";
    if (coarse || small || mem <= 4 || cores <= 4) return "medium";
  } catch {
    /* fall through */
  }
  return "high";
}

const fromUrl = urlTier();
const detected = detectTier();

interface QualityState {
  tier: Tier;
  /** pinned by the URL or by config.json → the frame-rate guard never changes it */
  locked: boolean;
  reduceMotion: boolean;
  applyPref: (pref: QualityPref) => void;
  stepDown: () => boolean;
}

export const useQuality = create<QualityState>((set, get) => ({
  tier: fromUrl ?? detected,
  locked: fromUrl !== null,
  reduceMotion: (() => {
    try {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    } catch {
      return false;
    }
  })(),

  applyPref: (pref) => {
    if (fromUrl) return; // the URL always wins
    const s = get();
    if (pref === "auto") {
      if (s.locked) set({ tier: detected, locked: false });
    } else if (s.tier !== pref || !s.locked) {
      set({ tier: pref, locked: true });
    }
  },

  stepDown: () => {
    const s = get();
    const i = ORDER.indexOf(s.tier);
    if (s.locked || i >= ORDER.length - 1) return false;
    set({ tier: ORDER[i + 1] });
    return true;
  },
}));

export function useProfile(): Profile {
  return PROFILES[useQuality((s) => s.tier)];
}

if (import.meta.env.DEV || fromUrl !== null || new URLSearchParams(window.location.search).has("debug")) {
  (window as unknown as { __quality: typeof useQuality }).__quality = useQuality;
}
