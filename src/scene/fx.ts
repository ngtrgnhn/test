/**
 * Tiny event bus between "things that happen" (a balloon pops, the cake lights up…)
 * and the particle system that draws the confetti. Keeps the scene components decoupled.
 */
export type Vec3 = [number, number, number];

export interface BurstOpts {
  origin: Vec3;
  /** main direction of the cannon (will be normalised); default straight up */
  dir?: Vec3;
  /** 0 = laser beam … 1 = full sphere */
  spread?: number;
  speed?: number;
  count?: number;
  colors?: string[];
  /** share of long thin ribbons among the pieces (0..1) */
  streamers?: number;
  /** seconds the pieces live */
  life?: number;
  size?: number;
}

type Sink = (o: BurstOpts) => void;
let sink: Sink | null = null;

export const fx = {
  bind(fn: Sink) {
    sink = fn;
    return () => {
      if (sink === fn) sink = null;
    };
  },
  burst(o: BurstOpts) {
    sink?.(o);
  },
};
