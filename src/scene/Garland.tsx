import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { lettersTexture, LETTER_CELL } from "./textures";
import { Pop } from "./anim";
import { overviewDistance, ROOM_YAW } from "./constants";

const PALETTE = ["#ff9ec6", "#ffd166", "#8fd9ff", "#ffffff", "#c9b3ff", "#8fe8cc"];
const BLANK_CELL = LETTER_CELL.cols * LETTER_CELL.rows - 1; // never painted → plain white

/** slot: a letter, "" for a blank flag, null for a gap */
type Slot = string | null;

function Pennants({
  slots, x0, x1, y0, y1, z, sag, flap = 1, texture, ropeColor = "#8c3a63",
}: {
  slots: Slot[];
  x0: number; x1: number; y0: number; y1: number; z: number; sag: number;
  flap?: number;
  texture: THREE.Texture;
  ropeColor?: string;
}) {
  const geo = useRef<THREE.BufferGeometry>(null);

  const { base, rope, cells } = useMemo(() => {
    const n = slots.length;
    const at = (t: number) =>
      new THREE.Vector3(
        THREE.MathUtils.lerp(x0, x1, t),
        THREE.MathUtils.lerp(y0, y1, t) - sag * Math.sin(Math.PI * t),
        z
      );
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) pts.push(at(i / 48));
    const rope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, 0.011, 5, false);

    const slotW = (x1 - x0) / n;
    const w = slotW * 0.86;
    const list: { tl: THREE.Vector3; tr: THREE.Vector3; ap: THREE.Vector3; cell: number; color: THREE.Color }[] = [];
    let li = 0;
    slots.forEach((s, i) => {
      if (s === null) return;
      const tl = at((i + 0.07) / n);
      const tr = at((i + 0.93) / n);
      const mid = tl.clone().add(tr).multiplyScalar(0.5);
      const dir = tr.clone().sub(tl);
      const wLen = dir.length();
      const ap = mid.clone().add(new THREE.Vector3(0, -Math.max(wLen, w) * 1.12, 0.0));
      list.push({
        tl, tr, ap,
        cell: s === "" ? BLANK_CELL : li++,
        color: new THREE.Color(PALETTE[list.length % PALETTE.length]),
      });
    });
    return { base: list, rope, cells: list.length };
  }, [slots, x0, x1, y0, y1, z, sag]);

  // geometry buffers (positions are animated every frame)
  const buffers = useMemo(() => {
    const n = base.length;
    const pos = new Float32Array(n * 9);
    const uv = new Float32Array(n * 6);
    const col = new Float32Array(n * 9);
    const nor = new Float32Array(n * 9);
    const { cols, rows } = LETTER_CELL;
    base.forEach((p, i) => {
      const cx = p.cell % cols;
      const cy = Math.floor(p.cell / cols);
      const du = 1 / cols;
      const dv = 1 / rows;
      const u0 = cx * du;
      const v1 = 1 - cy * dv;
      const v0 = v1 - dv;
      const pad = 0.045;
      uv.set([u0 + pad * du, v1 - pad * dv, u0 + du - pad * du, v1 - pad * dv, u0 + 0.5 * du, v0 + pad * dv], i * 6);
      for (let k = 0; k < 3; k++) {
        col.set([p.color.r, p.color.g, p.color.b], i * 9 + k * 3);
        nor.set([0, 0, 1], i * 9 + k * 3);
      }
    });
    return { pos, uv, col, nor };
  }, [base]);

  useEffect(() => {
    const g = geo.current;
    if (!g) return;
    g.setAttribute("position", new THREE.BufferAttribute(buffers.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(buffers.uv, 2));
    g.setAttribute("color", new THREE.BufferAttribute(buffers.col, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(buffers.nor, 3));
    g.computeBoundingSphere();
  }, [buffers]);

  useEffect(() => () => rope.dispose(), [rope]);

  useFrame((state) => {
    const g = geo.current;
    if (!g) return;
    const attr = g.getAttribute("position") as THREE.BufferAttribute | undefined;
    if (!attr) return;
    const t = state.clock.elapsedTime;
    const a = attr.array as Float32Array;
    base.forEach((p, i) => {
      const wave = Math.sin(t * 1.9 + i * 0.7) * 0.5 + Math.sin(t * 3.1 + i * 1.3) * 0.25;
      const o = i * 9;
      a[o] = p.tl.x; a[o + 1] = p.tl.y; a[o + 2] = p.tl.z;
      a[o + 3] = p.tr.x; a[o + 4] = p.tr.y; a[o + 5] = p.tr.z;
      a[o + 6] = p.ap.x + wave * 0.03 * flap;
      a[o + 7] = p.ap.y + Math.abs(wave) * 0.012 * flap;
      a[o + 8] = p.ap.z + wave * 0.06 * flap;
    });
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={rope} userData={{ noShadow: true }}>
        <meshBasicMaterial color={ropeColor} />
      </mesh>
      {cells > 0 && (
        <mesh frustumCulled={false} userData={{ noShadow: true }}>
          <bufferGeometry ref={geo} />
          <meshLambertMaterial map={texture} vertexColors side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * The party garland: one pennant per letter of `scene.garland` (config.json), plus a second,
 * plain strand behind it. The span follows the screen width so the whole text always fits.
 */
export function Garland({ text }: { text: string }) {
  const size = useThree((s) => s.size);
  const aspect = size.width / Math.max(size.height, 1);

  const letters = useMemo(() => Array.from(text.trim().toUpperCase()).slice(0, 26), [text]);
  const slots = useMemo<Slot[]>(() => letters.map((c) => (c === " " ? null : c)), [letters]);
  const lettersTex = useMemo(() => lettersTexture(slots.map((s) => s ?? "").filter((s) => s !== "")), [slots]);
  useEffect(() => () => lettersTex.dispose(), [lettersTex]);

  const span = useMemo(() => {
    const d = overviewDistance(aspect) + 3.2;
    const visW = 2 * d * Math.tan((42 * Math.PI) / 360) * aspect;
    const s = THREE.MathUtils.clamp(visW * 0.82, 3.4, 9.4);
    return Math.round(s * 5) / 5;
  }, [aspect]);

  const blankSlots = useMemo<Slot[]>(() => Array.from({ length: 22 }, () => ""), []);
  const blankTex = useMemo(() => lettersTexture([]), []);
  useEffect(() => () => blankTex.dispose(), [blankTex]);

  return (
    // turned with the room, so the garland squarely faces the resting camera
    <group rotation={[0, ROOM_YAW, 0]}>
      {slots.length > 0 && (
        <Pop delay={1.0} dur={1.0} ease="back" origin={[0, 5.3, -3.4]} rise={1.7} from={0.75}>
          <Pennants slots={slots} x0={-span / 2} x1={span / 2} y0={5.5} y1={5.4} z={-3.4} sag={span * 0.07} texture={lettersTex} />
        </Pop>
      )}
      <Pop delay={1.25} dur={1.0} ease="back" origin={[0, 4.9, -5.2]} rise={1.5} from={0.8}>
        <Pennants slots={blankSlots} x0={-8.5} x1={8.5} y0={5.15} y1={5.05} z={-5.2} sag={0.75} texture={blankTex} flap={1.4} />
      </Pop>
    </group>
  );
}
