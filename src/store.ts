import { create } from 'zustand';

export type Phase = 'loading' | 'intro' | 'party' | 'approach' | 'blowing' | 'blown' | 'relight';
export type Panel = 'letter' | 'memories' | 'gifts';
export const CEREMONY: Phase[] = ['approach', 'blowing', 'blown', 'relight'];

interface PartyState {
  phase: Phase;
  sceneFailed: boolean;
  panel: Panel | null;
  charReady: boolean;
  candlesLit: boolean;
  burst: number;
  douse: number;
  enteredAt: number | null;
  cakeHover: boolean;
  resetView: number;
  enterParty: () => void;
  openPanel: (panel: Panel) => void;
  closePanel: () => void;
  resetCamera: () => void;
  startApproach: () => void;
  onCharacterArrived: () => void;
  requestBlow: () => void;
  onFlamesOut: () => void;
  onBannerShown: () => void;
  requestRelight: () => void;
  onCandlesRelit: () => void;
  finishRelight: () => void;
  fireBurst: () => void;
  setCakeHover: (v: boolean) => void;
}

export const useParty = create<PartyState>((set, get) => ({
  phase: 'loading', sceneFailed: false, panel: null, charReady: false, candlesLit: true,
  burst: 0, douse: 0, enteredAt: null, cakeHover: false, resetView: 0,
  enterParty: () => {
    if (get().phase !== 'intro') return;
    set({ phase: 'party', burst: get().burst + 1, enteredAt: performance.now() });
  },
  openPanel: (panel) => {
    if (get().phase === 'party') set({ panel, cakeHover: false });
  },
  closePanel: () => set({ panel: null }),
  resetCamera: () => set({ resetView: get().resetView + 1 }),
  startApproach: () => {
    if (get().phase !== 'party' || get().panel || get().sceneFailed) return;
    set({ phase: 'approach', charReady: false, cakeHover: false });
  },
  onCharacterArrived: () => {
    if (get().phase === 'approach') set({ charReady: true });
  },
  requestBlow: () => {
    if (get().phase === 'approach' && get().charReady) set({ phase: 'blowing', cakeHover: false });
  },
  onFlamesOut: () => {
    const s = get();
    if (s.phase === 'blowing' && s.candlesLit)
      set({ candlesLit: false, douse: s.douse + 1, burst: s.burst + 1 });
  },
  onBannerShown: () => {
    if (get().phase === 'blowing' && !get().candlesLit) set({ phase: 'blown' });
  },
  requestRelight: () => {
    if (get().phase === 'blown') set({ phase: 'relight', cakeHover: false });
  },
  onCandlesRelit: () => {
    if (get().phase === 'relight') set({ candlesLit: true });
  },
  finishRelight: () => {
    if (get().phase === 'relight' && get().candlesLit) set({ phase: 'party', charReady: false });
  },
  fireBurst: () => set({ burst: get().burst + 1 }),
  setCakeHover: (v) => { if (get().cakeHover !== v) set({ cakeHover: v }); },
}));

if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  (window as unknown as { __party: typeof useParty }).__party = useParty;
}
