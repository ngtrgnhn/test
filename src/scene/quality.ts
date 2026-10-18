import { create } from 'zustand';
import type { QualityPref } from '../config';

/** Detail is fixed at high, including on phones; legacy preferences never lower fidelity. */
export type Tier = 'high';
export interface Profile {
  tier: Tier; dpr: [number,number]; bloom: boolean; bloomStrength: number; msaa: number;
  shadows: boolean; shadowMap: number; confetti: number; burst: number; glitter: number;
  fancy: boolean; texture: number;
}
export const HIGH_PROFILE: Profile = {
  tier:'high', dpr:[1,2], bloom:true, bloomStrength:.24, msaa:4,
  shadows:true, shadowMap:2048, confetti:1, burst:480, glitter:1, fancy:true, texture:2048,
};
export const PROFILES = { high: HIGH_PROFILE };
interface QualityState {
  tier: Tier; locked: boolean; reduceMotion: boolean;
  applyPref: (pref: QualityPref) => void; stepDown: () => boolean;
}
export const useQuality = create<QualityState>(() => ({
  tier:'high', locked:true,
  reduceMotion:(() => { try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; } catch { return false; } })(),
  applyPref:() => { /* v2.1 preserves high detail regardless of an old URL/config. */ },
  stepDown:() => false,
}));
export function useProfile(): Profile { return HIGH_PROFILE; }
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug'))
  (window as unknown as { __quality: typeof useQuality }).__quality = useQuality;
