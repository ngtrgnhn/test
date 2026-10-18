import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useParty } from "../store";
import {
  CAKE_TOP_Y, CANDLE_H, CANDLE_R, FLAME_Y, PLATE_Y, PLATE_R, TABLE_H, TIER, candlePositions,
  PASTEL, CANDY,
} from "./constants";
import {
  toonGradient, candleStripeTexture, puffTexture, glowTexture, ageTagTexture, topperTexture,
  layerTexture, strawberryTexture,
} from "./textures";
import { useEnv } from "./Env";
import { useProfile } from "./quality";
import { Pop, stepProgress } from "./anim";
import { cakeIsClickable, breath } from "./interaction";
import { rig } from "./Lights";

function heartShape(s: number) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s);
  sh.bezierCurveTo(s * 1.25, s * 0.25, s * 0.62, s * 1.15, 0, s * 0.52);
  sh.bezierCurveTo(-s * 0.62, s * 1.15, -s * 1.25, s * 0.25, 0, -s);
  return sh;
}

const tierBase = (i: number) => PLATE_Y + TIER.slice(0, i).reduce((a, t) => a + t.h, 0);

/* ------------------------------------------------------------------ */
/* shared geometry                                                     */
/* ------------------------------------------------------------------ */

/** frosting cap with a rolled edge */
function capGeometry(r: number) {
  const pts = [
    [0, 0.078],
    [r * 0.55, 0.076],
    [r * 0.9, 0.068],
    [r - 0.015, 0.06],
    [r + 0.018, 0.05],
    [r + 0.038, 0.032],
    [r + 0.04, 0.012],
    [r + 0.022, -0.012],
    [r - 0.01, -0.03],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 72);
}

/** piped-frosting swirl */
function rosetteGeometry() {
  const g = new THREE.ConeGeometry(0.058, 0.13, 18, 8);
  g.translate(0, 0.065, 0);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    const rr = r * (1 + 0.2 * Math.cos(a * 8 + y * 34));
    const na = a + y * 9;
    p.setXYZ(i, Math.cos(na) * rr, y, Math.sin(na) * rr);
  }
  g.computeVertexNormals();
  return g;
}

/** teardrop flame */
function flameGeometry(s = 1) {
  const pts = [
    [0.0, 0.0],
    [0.026, 0.01],
    [0.04, 0.036],
    [0.04, 0.066],
    [0.03, 0.1],
    [0.016, 0.132],
    [0.0, 0.165],
  ].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  return new THREE.LatheGeometry(pts, 14);
}

/* ------------------------------------------------------------------ */
/* candle                                                              */
/* ------------------------------------------------------------------ */
const FLAME_OUT = new THREE.Color(3.2, 1.25, 0.2);
const FLAME_IN = new THREE.Color(3.4, 2.9, 1.7);

function Candle({
  pos, index, stripe, grad, outer, inner,
}: {
  pos: THREE.Vector3; index: number; stripe: string; grad: THREE.Texture;
  outer: THREE.BufferGeometry; inner: THREE.BufferGeometry;
}) {
  const candlesLit = useParty((s) => s.candlesLit);
  const [lit, setLit] = useState(true);
  const flame = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const smoke = useRef<(THREE.Sprite | null)[]>([]);
  const smokeT = useRef(-1);
  const puff = useMemo(() => puffTexture(), []);
  const glow = useMemo(() => glowTexture(), []);
  const seed = useMemo(() => index * 13.7, [index]);
  const stripeTex = useMemo(() => candleStripeTexture(stripe), [stripe]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLit(candlesLit);
      if (!candlesLit) smokeT.current = 0;
    }, 90 + index * 130);
    return () => clearTimeout(t);
  }, [candlesLit, index]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const g = flame.current;
    if (g) {
      const ignite = stepProgress(1.05 + index * 0.14, 0.4);
      const target = lit ? ignite : 0;
      const ns = THREE.MathUtils.damp(g.scale.z, target, lit ? 16 : 24, dt);
      const wob = 1 + Math.sin(t * 17 + seed) * 0.12 + Math.sin(t * 29 + seed * 2) * 0.05;
      const bk = breath.active && lit ? 1 : 0;
      const lean = THREE.MathUtils.damp(g.userData.lean ?? 0, bk * 0.95, 8, dt);
      g.userData.lean = lean;
      const shake = bk * Math.sin(t * 46 + seed) * 0.14;
      g.scale.set(Math.max(ns, 0.0001) * (1 - lean * 0.25), Math.max(ns, 0.0001) * wob * (1 + lean * 0.2), Math.max(ns, 0.0001));
      g.position.y = CANDLE_H / 2 + 0.05;
      g.rotation.z = Math.sin(t * 9 + seed) * 0.1 - lean * breath.dx + shake;
      g.rotation.x = lean * breath.dz + Math.sin(t * 7.3 + seed) * 0.05;
      if (halo.current) {
        const m = halo.current.material as THREE.SpriteMaterial;
        const base = 0.26 + (1 - rig.level) * 0.3;
        m.opacity = Math.min(1, ns) * base * (0.85 + Math.sin(t * 13 + seed) * 0.1);
        halo.current.scale.setScalar(0.42 + (1 - rig.level) * 0.25 + Math.sin(t * 9 + seed) * 0.02);
      }
    }
    if (smokeT.current >= 0) {
      smokeT.current += dt;
      let any = false;
      smoke.current.forEach((s, j) => {
        if (!s) return;
        const tj = smokeT.current - j * 0.24;
        const p = tj / 2.0;
        if (tj < 0 || p >= 1) {
          s.visible = false;
          return;
        }
        any = true;
        s.visible = true;
        s.position.set(Math.sin(p * 6 + seed + j) * 0.06 * p, CANDLE_H / 2 + 0.12 + p * 1.0, Math.cos(p * 5 + seed) * 0.05 * p);
        const sc = 0.09 + p * 0.5;
        s.scale.set(sc, sc, 1);
        (s.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - p) * Math.min(1, tj * 5);
      });
      if (!any && smokeT.current > 3) smokeT.current = -1;
    }
  });

  return (
    <group position={pos}>
      <mesh>
        <cylinderGeometry args={[CANDLE_R, CANDLE_R, CANDLE_H, 14]} />
        <meshToonMaterial map={stripeTex} gradientMap={grad} color="#ffffff" />
      </mesh>
      {/* little frosting seat */}
      <mesh position={[0, -CANDLE_H / 2 + 0.02, 0]}>
        <cylinderGeometry args={[CANDLE_R * 1.9, CANDLE_R * 2.3, 0.04, 14]} />
        <meshToonMaterial color="#ffffff" gradientMap={grad} />
      </mesh>
      <mesh position={[0, CANDLE_H / 2 + 0.014, 0]}>
        <cylinderGeometry args={[0.0055, 0.0055, 0.05, 6]} />
        <meshToonMaterial color={CANDY.ink} gradientMap={grad} />
      </mesh>
      <group ref={flame} position={[0, CANDLE_H / 2 + 0.05, 0]}>
        <mesh geometry={outer} userData={{ noShadow: true }}>
          <meshBasicMaterial color={FLAME_OUT} transparent opacity={0.92} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh geometry={inner} position={[0, 0.006, 0.002]} userData={{ noShadow: true }}>
          <meshBasicMaterial color={FLAME_IN} toneMapped={false} />
        </mesh>
        <sprite ref={halo} position={[0, 0.07, 0]} scale={0.42}>
          <spriteMaterial map={glow} color={new THREE.Color(1.5, 0.75, 0.3)} transparent opacity={0.45} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      </group>
      {[0, 1, 2].map((j) => (
        <sprite key={j} ref={(s) => (smoke.current[j] = s)} visible={false} scale={0.2}>
          <spriteMaterial map={puff} transparent opacity={0} depthWrite={false} color="#ece3f3" />
        </sprite>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* decorations (instanced)                                             */
/* ------------------------------------------------------------------ */
function useInstances(
  count: number,
  fill: (i: number, d: THREE.Object3D, c: THREE.Color) => void,
  deps: unknown[],
  colored = false
) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      d.position.set(0, 0, 0);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, 1, 1);
      c.set("#ffffff");
      fill(i, d, c);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      if (colored) m.setColorAt(i, c);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function Sprinkles({ grad }: { grad: THREE.Texture }) {
  const per = 26;
  const data = useMemo(() => {
    const out: { x: number; y: number; z: number; e: [number, number, number]; c: string }[] = [];
    TIER.forEach((tier, ti) => {
      const topY = tierBase(ti) + tier.h + 0.082;
      for (let i = 0; i < per; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * (tier.r - 0.2) + (ti === 2 ? 0 : 0.05);
        out.push({
          x: Math.cos(a) * r, y: topY, z: Math.sin(a) * r,
          e: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
          c: PASTEL[i % PASTEL.length],
        });
      }
    });
    return out;
  }, []);
  const ref = useInstances(data.length, (i, d, c) => {
    const s = data[i];
    d.position.set(s.x, s.y, s.z);
    d.rotation.set(...s.e);
    c.set(s.c);
  }, [data], true);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, data.length]} frustumCulled={false} userData={{ noShadow: true }}>
      <capsuleGeometry args={[0.009, 0.034, 3, 6]} />
      <meshToonMaterial gradientMap={grad} color="#ffffff" />
    </instancedMesh>
  );
}

function Drips({ tier, color, grad }: { tier: number; color: string; grad: THREE.Texture }) {
  const r = TIER[tier].r + 0.012;
  const count = tier === 0 ? 26 : tier === 1 ? 20 : 15;
  const y0 = tierBase(tier) + TIER[tier].h + 0.012;
  const ref = useInstances(count, (i, d) => {
    const a = (i / count) * Math.PI * 2 + tier * 0.5;
    const len = 0.1 + (((i * 37 + tier * 13) % 10) / 10) * 0.2;
    const w = 1 + (((i * 23 + tier * 7) % 5) / 5) * 0.5;
    d.position.set(Math.cos(a) * r, y0 - len / 2, Math.sin(a) * r);
    d.rotation.y = -a;
    d.scale.set(w, len / 0.2, w * 0.9);
  }, [count, r, y0, tier]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <capsuleGeometry args={[0.03, 0.14, 4, 8]} />
      <meshToonMaterial color={color} gradientMap={grad} />
    </instancedMesh>
  );
}

function Pearls({ tier }: { tier: number }) {
  const env = useEnv();
  const r = TIER[tier].r + 0.014;
  const count = tier === 0 ? 34 : tier === 1 ? 26 : 20;
  const y = tierBase(tier) + 0.03;
  const ref = useInstances(count, (i, d) => {
    const a = (i / count) * Math.PI * 2;
    d.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
  }, [count, r, y]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[0.04, 12, 10]} />
      <meshStandardMaterial color="#fff6fa" roughness={0.18} metalness={0.1} envMap={env} envMapIntensity={0.9} />
    </instancedMesh>
  );
}

function Rosettes({ tier, color, geo, grad }: { tier: number; color: string; geo: THREE.BufferGeometry; grad: THREE.Texture }) {
  const profile = useProfile();
  const r = TIER[tier].r - 0.07;
  const count = profile.tier === "high" ? [34, 26, 18][tier] : [24, 18, 12][tier];
  const y = tierBase(tier) + TIER[tier].h + 0.066;
  const ref = useInstances(count, (i, d) => {
    const a = (i / count) * Math.PI * 2;
    d.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    d.rotation.y = i * 0.7;
    d.scale.setScalar(tier === 2 ? 0.78 : 1);
  }, [count, r, y, tier]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} frustumCulled={false}>
      <meshToonMaterial color={color} gradientMap={grad} />
    </instancedMesh>
  );
}

function Strawberries({ grad }: { grad: THREE.Texture }) {
  const tex = useMemo(() => strawberryTexture(), []);
  const spots = useMemo(() => [0,1].flatMap(tier => {
    const n = tier === 0 ? 8 : 6;
    return Array.from({ length:n },(_,i) => {
      const a = i / n * Math.PI * 2 + (tier === 0 ? .3 : .8);
      const r = TIER[tier].r - (tier === 0 ? .27 : .24);
      return { x:Math.cos(a)*r, z:Math.sin(a)*r, y:tierBase(tier)+TIER[tier].h+.1, s:.075+i%3*.006, a };
    });
  }), []);
  const fruit = useInstances(spots.length,(i,d) => {
    const p=spots[i]; d.position.set(p.x,p.y,p.z); d.rotation.y=p.a; d.scale.set(p.s,p.s*1.06,p.s);
  },[spots]);
  const leaf = useInstances(spots.length,(i,d) => {
    const p=spots[i]; d.position.set(p.x,p.y+p.s*.92,p.z); d.rotation.set(Math.PI,p.a,0); d.scale.set(p.s*.62,p.s*.45,p.s*.62);
  },[spots]);
  return <group>
    <instancedMesh ref={fruit} args={[undefined,undefined,spots.length]} castShadow><sphereGeometry args={[1,18,14]} /><meshStandardMaterial map={tex} roughness={.35} /></instancedMesh>
    <instancedMesh ref={leaf} args={[undefined,undefined,spots.length]} castShadow><coneGeometry args={[1,1,7]} /><meshToonMaterial color="#79c27d" gradientMap={grad} /></instancedMesh>
  </group>;
}

/* ------------------------------------------------------------------ */
/* topper: glossy heart with config text + age badge                   */
/* ------------------------------------------------------------------ */
function Topper({ age, text, grad }: { age: number; text: string; grad: THREE.Texture }) {
  const env = useEnv();
  const group = useRef<THREE.Group>(null);
  const heart = useRef<THREE.Group>(null);
  const heartGeo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(heartShape(0.17), {
      depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.022, bevelSegments: 4, curveSegments: 24,
    });
    g.center();
    return g;
  }, []);
  const textTex = useMemo(() => topperTexture(text), [text]);
  const ageTex = useMemo(() => ageTagTexture(age), [age]);
  useEffect(() => () => textTex.dispose(), [textTex]);
  useEffect(() => () => ageTex.dispose(), [ageTex]);

  useFrame((state, rawDt) => {
    const t = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y = Math.sin(t * 0.6) * 0.16 + 0.5;
    if (heart.current) {
      const hint = cakeIsClickable();
      // a heartbeat when the cake is the thing to press
      const beat = hint ? Math.pow(Math.max(0, Math.sin(t * 4.4)), 8) * 0.14 : 0;
      const target = 1 + beat;
      heart.current.scale.setScalar(THREE.MathUtils.damp(heart.current.scale.x, target, 20, Math.min(rawDt, 0.05)));
    }
  });

  return (
    <group ref={group} position={[0, CAKE_TOP_Y + 0.66, 0]} rotation={[0, 0.5, 0]}>
      <group ref={heart} position={[0, 0.04, 0]}>
        <mesh geometry={heartGeo}>
          <meshStandardMaterial color="#ff4f93" roughness={0.22} metalness={0.15} envMap={env} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0, 0.006, 0.066]} userData={{ noShadow: true }}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial map={textTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.006, -0.066]} rotation={[0, Math.PI, 0]} userData={{ noShadow: true }}>
          <planeGeometry args={[0.3, 0.3]} />
          <meshBasicMaterial map={textTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, -0.34, 0]}>
        <cylinderGeometry args={[0.011, 0.011, 0.62, 6]} />
        <meshStandardMaterial color="#f4d9a8" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.32, 0.03]} userData={{ noShadow: true }}>
        <planeGeometry args={[0.34, 0.17]} />
        <meshBasicMaterial map={ageTex} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* "press me" ripple around the plate                                  */
/* ------------------------------------------------------------------ */
function CakeRipple() {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const k = useRef(0);
  const color = useMemo(() => new THREE.Color(1.15, 0.4, 0.75), []);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const hover = useParty.getState().cakeHover ? 1 : 0;
    const on = cakeIsClickable() ? 1 : 0;
    k.current = THREE.MathUtils.damp(k.current, on, 5, dt);
    const t = state.clock.elapsedTime;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const ph = (t * (0.42 + hover * 0.25) + i * 0.5) % 1;
      const s = 1 + ph * 0.5;
      m.scale.set(s, s, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = k.current * Math.pow(1 - ph, 1.6) * (0.22 + hover * 0.18);
      m.visible = k.current > 0.01;
    });
  });
  return (
    <group position={[0, TABLE_H + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(m) => (meshes.current[i] = m)} visible={false} renderOrder={3} userData={{ noShadow: true }}>
          <ringGeometry args={[PLATE_R + 0.03, PLATE_R + 0.09, 128]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* the whole cake                                                      */
/* ------------------------------------------------------------------ */
export function Cake({ candleCount, age, topper }: { candleCount: number; age: number; topper: string }) {
  const profile = useProfile();
  const env = useEnv();
  const grad = useMemo(() => toonGradient(), []);
  const candlesLit = useParty((s) => s.candlesLit);
  const light = useRef<THREE.PointLight>(null);
  const root = useRef<THREE.Group>(null);
  const positions = useMemo(() => candlePositions(candleCount), [candleCount]);

  const caps = useMemo(() => TIER.map((t) => capGeometry(t.r + 0.03 - 0.03)), []);
  const rosette = useMemo(() => rosetteGeometry(), []);
  const flameOuter = useMemo(() => flameGeometry(1), []);
  const flameInner = useMemo(() => flameGeometry(0.52), []);
  const layers = useMemo(
    () => [
      layerTexture("#ffe4c9", "#ff7a9c"),
      layerTexture("#ffd3e5", "#ff6f9a"),
      layerTexture("#fff0dc", "#ff8fb0"),
    ],
    []
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const hover = useParty.getState().cakeHover;
    if (light.current) {
      const target = candlesLit ? (hover ? 0.85 : 0.65) : 0;
      light.current.intensity = THREE.MathUtils.damp(
        light.current.intensity,
        target * (1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29 + 2) * 0.05),
        9, dt
      );
    }
    if (root.current) {
      const s = THREE.MathUtils.damp(root.current.scale.x, hover ? 1.028 : 1, 10, dt);
      root.current.scale.set(s, s, s);
    }
  });

  const tierColor = ["#ffe4c9", "#ffd3e5", "#fff0dc"];
  const capColors = [CANDY.punch, "#ffffff", CANDY.punch];
  const rosetteColors = ["#fff4f8", "#ffb3d1", "#fff4f8"];

  return (
    <group ref={root}>
      <Pop delay={0.35} dur={0.95} ease="back" origin={[0, TABLE_H, 0]}>
        <group>
          {/* plate + pedestal */}
          <mesh position={[0, TABLE_H + 0.015, 0]}>
            <cylinderGeometry args={[0.36, 0.42, 0.03, 40]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} envMap={env} envMapIntensity={0.7} />
          </mesh>
          <mesh position={[0, (TABLE_H + PLATE_Y) / 2 + 0.01, 0]}>
            <cylinderGeometry args={[0.09, 0.15, PLATE_Y - TABLE_H - 0.03, 20]} />
            <meshStandardMaterial color="#ffffff" roughness={0.25} envMap={env} envMapIntensity={0.7} />
          </mesh>
          <mesh position={[0, PLATE_Y - 0.03, 0]}>
            <cylinderGeometry args={[PLATE_R, PLATE_R - 0.12, 0.06, 64]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} envMap={env} envMapIntensity={0.9} />
          </mesh>
          <mesh position={[0, PLATE_Y - 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[PLATE_R - 0.01, 0.022, 10, 96]} />
            <meshStandardMaterial color={CANDY.candy} roughness={0.3} envMap={env} envMapIntensity={0.6} />
          </mesh>
          <mesh position={[0, PLATE_Y + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.92, 0.95, 96]} />
            <meshBasicMaterial color={CANDY.gold} />
          </mesh>

          {/* tiers */}
          {TIER.map((t, i) => {
            const baseY = tierBase(i);
            return (
              <group key={i}>
                <mesh position={[0, baseY + t.h / 2, 0]}>
                  <cylinderGeometry args={[t.r * 0.985, t.r, t.h, 72, 1, true]} />
                  <meshToonMaterial map={layers[i]} gradientMap={grad} color="#ffffff" />
                </mesh>
                <mesh position={[0, baseY + t.h / 2, 0]} scale={[0.97, 1, 0.97]}>
                  <cylinderGeometry args={[t.r * 0.985, t.r, t.h, 24]} />
                  <meshToonMaterial color={tierColor[i]} gradientMap={grad} />
                </mesh>
                <mesh geometry={caps[i]} position={[0, baseY + t.h, 0]}>
                  <meshToonMaterial color={capColors[i]} gradientMap={grad} />
                </mesh>
                <Drips tier={i} color={capColors[i]} grad={grad} />
                <Pearls tier={i} />
                {profile.fancy && <Rosettes tier={i} color={rosetteColors[i]} geo={rosette} grad={grad} />}
              </group>
            );
          })}

          <Sprinkles grad={grad} />
          <Strawberries grad={grad} />

          {positions.map((p, i) => (
            <Candle
              key={`${i}-${positions.length}`}
              pos={p}
              index={i}
              stripe={PASTEL[i % PASTEL.length]}
              grad={grad}
              outer={flameOuter}
              inner={flameInner}
            />
          ))}

          <Topper age={age} text={topper} grad={grad} />
        </group>
      </Pop>

      <CakeRipple />

      {/* warm flickering glow of all flames together (single light) */}
      <pointLight
        ref={light}
        position={[0, FLAME_Y + 0.22, 0.1]}
        color="#ffb066"
        intensity={0.65}
        distance={7}
        decay={1.7}
      />
    </group>
  );
}
