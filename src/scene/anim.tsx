import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useParty } from "../store";
import { useQuality } from "./quality";

/* ------------------------------------------------------------------ */
/* easing                                                              */
/* ------------------------------------------------------------------ */
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t: number, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutElastic = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -9 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) + 1;
};
export const easeOutBounce = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/* ------------------------------------------------------------------ */
/* entrance timeline                                                   */
/* ------------------------------------------------------------------ */

/**
 * Seconds since the party doors opened.
 *   -1  → the party has not started yet (envelope / loading): everything stays hidden
 *   999 → show everything at once: the page was put into a later phase without the ceremony
 *         (debug jump), or the visitor prefers reduced motion (no bouncing entrance / camera fly-in)
 */
export function sinceEntered(): number {
  const s = useParty.getState();
  if (s.phase === "loading" || s.phase === "intro") return -1;
  if (s.enteredAt === null || useQuality.getState().reduceMotion) return 999;
  return (performance.now() - s.enteredAt) / 1000;
}

/** 0..1 progress of an entrance step that starts `delay` seconds after the doors opened */
export function stepProgress(delay: number, dur: number): number {
  const t = sinceEntered();
  if (t < 0) return 0;
  return clamp01((t - delay) / dur);
}

type Ease = "back" | "elastic" | "cubic" | "bounce" | "soft";

const EASE: Record<Ease, (t: number) => number> = {
  back: (t) => easeOutBack(t, 1.9),
  elastic: easeOutElastic,
  cubic: easeOutCubic,
  bounce: easeOutBounce,
  soft: (t) => easeOutBack(t, 0.9),
};

/**
 * Pops its children into existence once the party opens.
 * `origin` is the pivot of the scale animation (in the parent's space);
 * `rise` is how far below (negative) / above (positive) their final place they start.
 */
export function Pop({
  delay = 0,
  dur = 0.7,
  ease = "back",
  origin = [0, 0, 0],
  rise = 0,
  from = 0.001,
  axes = [1, 1, 1],
  mode = "scale",
  children,
}: {
  delay?: number;
  dur?: number;
  ease?: Ease;
  origin?: [number, number, number];
  rise?: number;
  from?: number;
  axes?: [number, number, number];
  /** "scale" grows from `from` (and slides in from `rise`); "drop" keeps the size and falls from `rise` (use with the bounce ease) */
  mode?: "scale" | "drop";
  children: ReactNode;
}) {
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const done = useRef(false);

  useFrame(() => {
    const g = outer.current;
    if (!g) return;
    if (done.current) return;
    const k = stepProgress(delay, dur);
    if (k <= 0) {
      // not "invisible" but ~zero-sized: three.js still compiles its shaders during the
      // envelope screen, so the party opens without a hitch
      g.visible = true;
      g.scale.setScalar(0.0001);
      return;
    }
    g.visible = true;
    if (k >= 1) {
      g.scale.set(1, 1, 1);
      if (inner.current) inner.current.position.y = 0;
      done.current = sinceEntered() >= 999 || sinceEntered() > delay + dur + 0.05;
      return;
    }
    const e = EASE[ease](k);
    if (mode === "drop") {
      g.scale.set(1, 1, 1);
      if (inner.current) inner.current.position.y = rise * (1 - e);
      return;
    }
    const sx = THREE.MathUtils.lerp(from, 1, axes[0] ? e : 1);
    const sy = THREE.MathUtils.lerp(from, 1, axes[1] ? e : 1);
    const sz = THREE.MathUtils.lerp(from, 1, axes[2] ? e : 1);
    g.scale.set(Math.max(sx, 0.0001), Math.max(sy, 0.0001), Math.max(sz, 0.0001));
    if (inner.current) inner.current.position.y = rise * (1 - Math.min(1, easeOutCubic(k)));
  });

  return (
    <group position={origin}>
      <group ref={outer} scale={0.0001}>
        <group ref={inner}>
          <group position={[-origin[0], -origin[1], -origin[2]]}>{children}</group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* shadows                                                             */
/* ------------------------------------------------------------------ */

/**
 * Turns on casting/receiving for every solid mesh below it
 * (glows, sprites, additive and transparent helpers are skipped on purpose).
 */
export function Shadowed({
  cast = true,
  receive = true,
  children,
}: {
  cast?: boolean;
  receive?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.noShadow) return;
      const mat = m.material as THREE.Material | THREE.Material[];
      const first = Array.isArray(mat) ? mat[0] : mat;
      if (!first) return;
      const solid = !first.transparent && first.depthWrite !== false && first.colorWrite !== false && first.blending === THREE.NormalBlending;
      if (!solid) return;
      m.castShadow = cast;
      m.receiveShadow = receive;
    });
  });
  return <group ref={ref}>{children}</group>;
}
