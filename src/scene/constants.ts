import * as THREE from "three";

/* Shared scene metrics — camera rig, cake, character and decor all read from here
   so the framing math always matches the actual geometry. */

export const TABLE_H = 0.92;
export const TABLE_R = 1.45;
export const SKIRT_FLARE = 0.24;                 // how much wider the cloth is at the hem
export const PLATE_R = 1.02;
export const PLATE_Y = TABLE_H + 0.17;           // the cake stands on a small pedestal

export const TIER = [
  { r: 0.85, h: 0.5 },
  { r: 0.62, h: 0.42 },
  { r: 0.42, h: 0.34 },
];

export const CAKE_TOP_Y = PLATE_Y + TIER.reduce((a, t) => a + t.h, 0); // ≈ 2.35
export const CANDLE_H = 0.34;
export const CANDLE_R = 0.036;
export const CANDLE_RING_R = 0.24;
export const FLAME_Y = CAKE_TOP_Y + CANDLE_H + 0.09; // ≈ 2.78

/* the round room */
export const ROOM_R = 10.5;
export const ROOM_H = 13;
/** the room is turned so its "back" faces the camera's resting viewpoint */
export const ROOM_YAW = 0.54;
/** z of the curved wall at a given x (room space), pulled `inset` towards the centre */
export function wallZ(x: number, inset = 0): number {
  return -Math.sqrt(Math.max(ROOM_R * ROOM_R - x * x, 1)) + inset;
}

/* character */
/** where she waits while she is not in the scene */
export const CHAR_OFFSCREEN = new THREE.Vector3(-7.6, 0, 2.6);
export const CHAR_SPEED = 1.75;

/**
 * Where the girl walks to. On a wide screen she stands beside the table and is seen in profile;
 * on a tall/narrow one (phones) she stands a little further to the front so she stays on screen.
 */
export function stands(aspect: number) {
  const t = THREE.MathUtils.clamp((aspect - 0.7) / 0.5, 0, 1); // 0 = portrait phone … 1 = landscape
  const mix = (a: [number, number], b: [number, number]) =>
    new THREE.Vector3(THREE.MathUtils.lerp(a[0], b[0], t), 0, THREE.MathUtils.lerp(a[1], b[1], t));
  return {
    stand: mix([-1.5, 1.25], [-2.05, 0.55]),      // prays / blows here
    light: mix([-1.45, 1.0], [-2.0, 0.4]),        // relights here
    banner: mix([-1.5, 1.35], [-2.15, 0.95]),     // holds the wish banner here
    offscreen: mix([-4.4, 2.2], [-6.2, 2.3]),     // enters from / leaves to here
  };
}

/* candles positions on top tier */
export function candlePositions(count: number): THREE.Vector3[] {
  const n = Math.min(7, Math.max(3, Math.round(count)));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 2;
    pts.push(
      new THREE.Vector3(
        Math.cos(a) * CANDLE_RING_R,
        CAKE_TOP_Y + CANDLE_H / 2,
        Math.sin(a) * CANDLE_RING_R
      )
    );
  }
  return pts;
}

export const PASTEL = ["#ff8fc0", "#ffd166", "#8fd9ff", "#b79cff", "#7ee0c3", "#ff9d7e"];
export const CANDY = {
  ink: "#5a1539",
  punch: "#ff5c9e",
  punchDeep: "#e63f85",
  candy: "#ff8fc0",
  blush: "#ffd3e5",
  paper: "#fff4f8",
  cream: "#fff7ec",
  choco: "#8a5a3b",
  white: "#ffffff",
  mint: "#7ee0c3",
  butter: "#ffd166",
  skin: "#ffe4d2",
  hair: "#7c4a2e",
  dress: "#ff6fae",
  dressDeep: "#e85596",
  shoe: "#c93f7d",
  gold: "#f6c667",
};

/** same maths as the camera rig — decor that must stay on screen (the garland) uses it */
export function overviewDistance(aspect: number): number {
  const fov = 42;
  const rv = 3.0;
  const rh = 4.1;
  const vRad = (fov * Math.PI) / 180;
  const hRad = 2 * Math.atan(Math.tan(vRad / 2) * aspect);
  const rhEff = rh * THREE.MathUtils.clamp(aspect, 0.6, 1.5);
  return Math.max(rv / Math.tan(vRad / 2), rhEff / Math.tan(hRad / 2)) * 1.14;
}
