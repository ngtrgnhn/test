import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEnv } from "./Env";
import { useProfile } from "./quality";
import { rig } from "./Lights";
import { Twinkle } from "./Twinkle";
import {
  parquetTexture, wallTexture, skyTexture, rugTexture, glowTexture,
  starTexture, bokehTexture, shaftTexture,
} from "./textures";
import { ROOM_R, ROOM_H, ROOM_YAW, wallZ, CANDY } from "./constants";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function archShape(w: number, rectH: number, base = 0) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, base);
  s.lineTo(w / 2, base);
  s.lineTo(w / 2, rectH);
  s.absarc(0, rectH, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, base);
  return s;
}

/** hanging cloth: pleats, a tie-back pinch and a flare at the hem */
function curtainGeometry(w: number, h: number, pleats: number, amp: number, inward: number) {
  const g = new THREE.PlaneGeometry(w, h, 56, 24);
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const v = (h / 2 - y) / h; // 0 at the rod → 1 at the floor
    const u = x / w + 0.5;
    const pinch = Math.exp(-Math.pow((v - 0.6) / 0.11, 2));
    const flare = 1 + 0.2 * THREE.MathUtils.smoothstep(v, 0.72, 1);
    const nx = x * (1 - 0.42 * pinch) * flare + inward * pinch * w * 0.2;
    const fold = Math.sin(u * pleats * Math.PI * 2 + v * 1.4) * amp * (0.3 + 0.7 * v) * (1 - 0.5 * pinch);
    pos.setX(i, nx);
    pos.setZ(i, fold + pinch * 0.12);
  }
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ */
/* the arched window with the night sky                                */
/* ------------------------------------------------------------------ */
function ArchedWindow() {
  const env = useEnv();
  const sky = useMemo(() => skyTexture(), []);
  const star = useMemo(() => starTexture(), []);
  const dims = { W: 2.9, rectH: 2.2, t: 0.18 };
  const { frame, glass } = useMemo(() => {
    const { W, rectH, t } = dims;
    const outer = archShape(W, rectH);
    const inner = archShape(W - 2 * t, rectH, t);
    outer.holes.push(inner);
    const frame = new THREE.ExtrudeGeometry(outer, { depth: 0.22, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 24 });
    const glass = new THREE.ShapeGeometry(archShape(W - 2 * t, rectH, t), 24);
    const wi = W - 2 * t;
    const hi = rectH + wi / 2 - t;
    const p = glass.getAttribute("position");
    const uv = glass.getAttribute("uv");
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + wi / 2) / wi, (p.getY(i) - t) / hi);
    return { frame, glass };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { W, rectH, t } = dims;
  const wi = W - 2 * t;
  const innerH = rectH + wi / 2 - t;

  return (
    <group position={[0, 2.9, wallZ(0, 0.06)]}>
      <mesh geometry={glass} position={[0, 0, 0.05]} userData={{ noShadow: true }}>
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      <mesh geometry={frame}>
        <meshStandardMaterial color="#fffaf5" roughness={0.45} envMap={env} envMapIntensity={0.5} />
      </mesh>
      {/* mullions */}
      <mesh position={[0, t + (rectH - t) / 2, 0.14]}>
        <boxGeometry args={[0.07, rectH - t, 0.08]} />
        <meshStandardMaterial color="#fffaf5" roughness={0.45} />
      </mesh>
      <mesh position={[0, t + (rectH - t) * 0.5, 0.14]}>
        <boxGeometry args={[wi, 0.07, 0.08]} />
        <meshStandardMaterial color="#fffaf5" roughness={0.45} />
      </mesh>
      <mesh position={[0, rectH, 0.14]}>
        <boxGeometry args={[wi, 0.06, 0.07]} />
        <meshStandardMaterial color="#fffaf5" roughness={0.45} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -0.07, 0.3]}>
        <boxGeometry args={[W + 0.55, 0.14, 0.55]} />
        <meshStandardMaterial color="#fffaf5" roughness={0.5} />
      </mesh>
      {/* the stars out there actually twinkle (and bloom) */}
      <group position={[0, 0, 0.08]}>
        <Twinkle
          count={26}
          box={[0, t + innerH * 0.62, 0, wi * 0.42, innerH * 0.3, 0.001]}
          size={[0.07, 0.15]}
          speed={[1.2, 3.2]}
          colors={["#fff7e6", "#cfe4ff"]}
          texture={star}
          intensity={2.4}
          drift={0}
          pulse={0.25}
          renderOrder={2}
        />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* curtains + rod                                                      */
/* ------------------------------------------------------------------ */
function Curtains() {
  const profile = useProfile();
  const env = useEnv();
  const pleats = profile.fancy ? 7 : 5;
  const left = useMemo(() => curtainGeometry(1.55, 6.4, pleats, 0.13, 1), [pleats]);
  const right = useMemo(() => curtainGeometry(1.55, 6.4, pleats, 0.13, -1), [pleats]);
  const z = wallZ(0, 0.95);
  const gold = CANDY.gold;
  return (
    <group>
      <mesh geometry={left} position={[-2.75, 3.7, z]}>
        <meshStandardMaterial color="#ff86b4" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={right} position={[2.75, 3.7, z]}>
        <meshStandardMaterial color="#ff86b4" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* rod + finials */}
      <mesh position={[0, 6.95, z + 0.05]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, 7.0, 16]} />
        <meshStandardMaterial color={gold} roughness={0.28} metalness={0.8} envMap={env} envMapIntensity={1.1} />
      </mesh>
      {[-3.55, 3.55].map((x) => (
        <mesh key={x} position={[x, 6.95, z + 0.05]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color={gold} roughness={0.25} metalness={0.85} envMap={env} envMapIntensity={1.2} />
        </mesh>
      ))}
      {/* tie-back cords */}
      {[-2.75, 2.75].map((x) => (
        <mesh key={x} position={[x * 0.93, 3.7 - 6.4 * (0.6 - 0.5), z + 0.14]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.36, 0.035, 8, 24]} />
          <meshStandardMaterial color={gold} roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* fairy lights draped across the wall                                 */
/* ------------------------------------------------------------------ */
function FairyStrand({
  x0, x1, y0, y1, sag, count, seed = 0,
}: { x0: number; x1: number; y0: number; y1: number; sag: number; count: number; seed?: number }) {
  const bulbs = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useMemo(() => glowTexture(), []);
  const { pts, wire } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const curve: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = THREE.MathUtils.lerp(x0, x1, t);
      const y = THREE.MathUtils.lerp(y0, y1, t) - sag * Math.sin(Math.PI * t);
      curve.push(new THREE.Vector3(x, y, wallZ(x, 0.4)));
    }
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = THREE.MathUtils.lerp(x0, x1, t);
      const y = THREE.MathUtils.lerp(y0, y1, t) - sag * Math.sin(Math.PI * t) - 0.07;
      pts.push(new THREE.Vector3(x, y, wallZ(x, 0.4)));
    }
    const wire = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 80, 0.012, 5, false);
    return { pts, wire };
  }, [x0, x1, y0, y1, sag, count]);

  useEffect(() => {
    const m = bulbs.current;
    if (!m) return;
    const cols = ["#fff1c9", "#ffd6ea", "#ffe7a8", "#ffffff", "#ffc2dc"];
    const d = new THREE.Object3D();
    pts.forEach((p, i) => {
      d.position.copy(p);
      d.scale.setScalar(0.8 + ((i * 7 + seed) % 5) * 0.08);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      m.setColorAt(i, new THREE.Color(cols[(i + seed) % cols.length]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [pts, seed]);

  useFrame((state) => {
    // the strings glow brighter when the room dims
    if (mat.current) {
      const k = 1 + (1 - rig.level) * 1.2;
      mat.current.color.setScalar(2.1 * k * (0.96 + Math.sin(state.clock.elapsedTime * 1.7 + seed) * 0.04));
    }
  });

  return (
    <group>
      <mesh geometry={wire} userData={{ noShadow: true }}>
        <meshBasicMaterial color="#7a3a58" />
      </mesh>
      <instancedMesh ref={bulbs} args={[undefined, undefined, count]} frustumCulled={false} userData={{ noShadow: true }}>
        <sphereGeometry args={[0.085, 10, 8]} />
        <meshBasicMaterial ref={mat} color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <Twinkle
        count={count}
        positions={pts}
        size={[0.5, 0.75]}
        speed={[0.8, 2.2]}
        colors={["#ffd9a0", "#ffb6d4"]}
        texture={glow}
        intensity={0.9}
        drift={0}
        pulse={0.45}
        globalRef={rig}
        glowWhenDim={1.0}
        renderOrder={4}
      />
    </group>
  );
}

function FairyLights() {
  const profile = useProfile();
  const n = profile.fancy ? 30 : 18;
  return (
    <group>
      <FairyStrand x0={-7.2} x1={7.2} y0={7.4} y1={7.4} sag={1.0} count={n + 6} seed={1} />
      <FairyStrand x0={-6.4} x1={6.4} y0={6.7} y1={6.8} sag={0.7} count={n} seed={3} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* moonlight shafts + floating dust                                    */
/* ------------------------------------------------------------------ */
function Shafts() {
  const tex = useMemo(() => shaftTexture(), []);
  const mats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const items = useMemo(
    () => [
      { x: -1.1, w: 1.5, rotY: 0.18, o: 0.08 },
      { x: 0.2, w: 1.1, rotY: -0.05, o: 0.07 },
      { x: 1.4, w: 1.7, rotY: -0.2, o: 0.075 },
    ],
    []
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    items.forEach((it, i) => {
      const m = mats.current[i];
      if (m) m.opacity = it.o * (0.85 + Math.sin(t * 0.5 + i * 2) * 0.15);
    });
  });
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={[it.x * 1.15, 3.7, wallZ(0, 3.1)]} rotation={[0.52, it.rotY, 0]} renderOrder={1} userData={{ noShadow: true }}>
          <planeGeometry args={[it.w, 9]} />
          <meshBasicMaterial
            ref={(m) => (mats.current[i] = m)}
            map={tex}
            color="#cfd8ff"
            transparent
            opacity={it.o}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* rug under the table                                                 */
/* ------------------------------------------------------------------ */
export function Rug() {
  const tex = useMemo(() => rugTexture(), []);
  const geo = useMemo(() => {
    const R = 2.95;
    const N = 40;
    const s = new THREE.Shape();
    const steps = 360;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = R - 0.06 * Math.abs(Math.sin((a * N) / 2));
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    const g = new THREE.ShapeGeometry(s, 1);
    const p = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * R) + 0.5, p.getY(i) / (2 * R) + 0.5);
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0.25]} receiveShadow>
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* the room                                                            */
/* ------------------------------------------------------------------ */
export function Room() {
  const profile = useProfile();
  const env = useEnv();
  const floorTex = useMemo(() => {
    const t = parquetTexture(1024);
    t.repeat.set(5, 5);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  const wallTex = useMemo(() => {
    const t = wallTexture(profile.texture);
    t.repeat.set(6, 1);
    return t;
  }, [profile.texture]);
  const glow = useMemo(() => glowTexture(), []);
  const bokeh = useMemo(() => bokehTexture(), []);
  const star = useMemo(() => starTexture(), []);
  const floorGlow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (floorGlow.current) floorGlow.current.opacity = 0.2 + Math.sin(state.clock.elapsedTime * 1.3) * 0.02 + (1 - rig.level) * 0.22;
  });

  return (
    <group rotation={[0, ROOM_YAW, 0]}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[ROOM_R + 0.6, 96]} />
        <meshStandardMaterial map={floorTex} roughness={0.58} envMap={env} envMapIntensity={0.22} />
      </mesh>
      {/* wall */}
      <mesh position={[0, ROOM_H / 2, 0]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[ROOM_R, ROOM_R, ROOM_H, 96, 1, true]} />
        <meshLambertMaterial map={wallTex} side={THREE.BackSide} />
      </mesh>
      {/* skirting board */}
      <mesh position={[0, 0.2, 0]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[ROOM_R - 0.07, ROOM_R - 0.07, 0.4, 96, 1, true]} />
        <meshStandardMaterial color="#fff4ee" roughness={0.5} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0.41, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noShadow: true }}>
        <torusGeometry args={[ROOM_R - 0.09, 0.04, 6, 128]} />
        <meshStandardMaterial color="#ffffff" roughness={0.4} />
      </mesh>

      <ArchedWindow />
      <Curtains />
      <FairyLights />
      <Shafts />

      {/* warm pool of candle light on the floor around the table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.2]} renderOrder={1} userData={{ noShadow: true }}>
        <circleGeometry args={[4.2, 48]} />
        <meshBasicMaterial ref={floorGlow} map={glow} color="#ffb06a" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>

      {/* out-of-focus lamps far behind: gives the room depth */}
      <Twinkle
        count={Math.round(26 * profile.glitter + 6)}
        box={[0, 4.2, -7.2, 8.5, 3.6, 2.4]}
        size={[0.35, 1.0]}
        speed={[0.25, 0.7]}
        colors={["#ffc7de", "#ffe1a8"]}
        texture={bokeh}
        intensity={0.16}
        drift={0.18}
        pulse={0.5}
        renderOrder={0}
      />
      {/* dust in the moonlight */}
      <Twinkle
        count={Math.round(60 * profile.glitter + 12)}
        box={[0, 3.2, -6.0, 3.8, 3.2, 3.6]}
        size={[0.025, 0.05]}
        speed={[0.5, 1.6]}
        colors={["#e6ecff", "#ffffff"]}
        texture={star}
        intensity={1.6}
        drift={0.35}
        pulse={0.2}
        renderOrder={6}
      />
    </group>
  );
}
