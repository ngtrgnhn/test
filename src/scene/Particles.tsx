import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useParty } from "../store";
import { PASTEL, CANDY, FLAME_Y, candlePositions } from "./constants";
import { starTexture, heartTexture } from "./textures";
import { Twinkle } from "./Twinkle";
import { useProfile, useQuality } from "./quality";
import { useEnv } from "./Env";
import { sinceEntered } from "./anim";
import { fx, type BurstOpts } from "./fx";
import { rig } from "./Lights";

/* ------------------------------------------------------------------ */
/* confetti drifting down the whole time                               */
/* ------------------------------------------------------------------ */
export function AmbientConfetti() {
  const profile = useProfile();
  const reduce = useQuality((s) => s.reduceMotion);
  const COUNT = Math.max(24, Math.round(150 * profile.confetti * (reduce ? 0.5 : 1)));
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() * 2 - 1) * 6,
        y: Math.random() * 7,
        z: -4 + Math.random() * 7,
        sp: 0.3 + Math.random() * 0.5,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        sx: 1.5 + Math.random() * 3,
        sy: 1.5 + Math.random() * 3,
        ph: Math.random() * Math.PI * 2,
        s: 0.8 + Math.random() * 0.7,
      })),
    [COUNT]
  );
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    data.forEach((_, i) => m.setColorAt(i, new THREE.Color(PASTEL[i % PASTEL.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useFrame((state, rawDt) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    m.visible = sinceEntered() > 0.5;
    if (!m.visible) return;
    data.forEach((d, i) => {
      d.y -= d.sp * dt;
      if (d.y < -0.2) d.y = 7;
      tmp.e.set(d.rx + t * d.sx, d.ry + t * d.sy, 0);
      tmp.q.setFromEuler(tmp.e);
      tmp.p.set(d.x + Math.sin(t * 0.8 + d.ph) * 0.35, d.y, d.z);
      tmp.s.setScalar(d.s);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false} userData={{ noShadow: true }}>
      <planeGeometry args={[0.075, 0.11]} />
      <meshBasicMaterial side={THREE.DoubleSide} color="#ffffff" />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* confetti cannons / pops (pooled, one draw call)                     */
/* ------------------------------------------------------------------ */
const CAN_COLORS = [CANDY.punch, CANDY.butter, "#8fd9ff", "#ffffff", "#b79cff", "#7ee0c3", CANDY.punchDeep];

export function ConfettiCannons({ candleCount }: { candleCount: number }) {
  const profile = useProfile();
  const burst = useParty((s) => s.burst);
  const N = profile.burst;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const S = useMemo(
    () => ({
      pos: new Float32Array(N * 3),
      vel: new Float32Array(N * 3),
      rot: new Float32Array(N * 3),
      spin: new Float32Array(N * 3),
      life: new Float32Array(N).fill(-1),
      max: new Float32Array(N),
      sx: new Float32Array(N),
      sy: new Float32Array(N),
      cursor: 0,
      active: 0,
    }),
    [N]
  );
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(), c: new THREE.Color(), d: new THREE.Vector3(), u: new THREE.Vector3(), v: new THREE.Vector3() }), []);

  const spawn = useMemo(
    () => (o: BurstOpts) => {
      const m = mesh.current;
      if (!m) return;
      const count = Math.min(N, Math.round(o.count ?? 60));
      const dir = tmp.d.set(...(o.dir ?? [0, 1, 0])).normalize();
      // two vectors perpendicular to dir, for the cone spread
      const a = Math.abs(dir.y) < 0.9 ? tmp.u.set(0, 1, 0) : tmp.u.set(1, 0, 0);
      const b = tmp.v.crossVectors(dir, a).normalize();
      const a2 = a.crossVectors(b, dir).normalize();
      const spread = o.spread ?? 0.4;
      const speed = o.speed ?? 5;
      const colors = o.colors ?? CAN_COLORS;
      for (let n = 0; n < count; n++) {
        const i = S.cursor++ % N;
        const th = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(Math.random()) * spread;
        const vx = dir.x + (Math.cos(th) * b.x + Math.sin(th) * a2.x) * rr;
        const vy = dir.y + (Math.cos(th) * b.y + Math.sin(th) * a2.y) * rr;
        const vz = dir.z + (Math.cos(th) * b.z + Math.sin(th) * a2.z) * rr;
        const len = Math.hypot(vx, vy, vz) || 1;
        const sp = speed * (0.55 + Math.random() * 0.7);
        S.pos.set([o.origin[0] + (Math.random() - 0.5) * 0.15, o.origin[1], o.origin[2] + (Math.random() - 0.5) * 0.15], i * 3);
        S.vel.set([(vx / len) * sp, (vy / len) * sp, (vz / len) * sp], i * 3);
        S.rot.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3);
        S.spin.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12], i * 3);
        S.life[i] = 0;
        S.max[i] = (o.life ?? 3.4) * (0.75 + Math.random() * 0.5);
        const streamer = Math.random() < (o.streamers ?? 0.18);
        const size = o.size ?? 1;
        S.sx[i] = (streamer ? 0.42 : 1) * size * (0.8 + Math.random() * 0.5);
        S.sy[i] = (streamer ? 3.4 : 1) * size * (0.8 + Math.random() * 0.5);
        m.setColorAt(i, tmp.c.set(colors[Math.floor(Math.random() * colors.length)]));
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      S.active = N;
    },
    [N, S, tmp]
  );

  useEffect(() => fx.bind(spawn), [spawn]);

  /* the store's `burst` counter = "celebrate!": a pop from the cake + a cannon on each side */
  const first = useRef(true);
  useEffect(() => {
    if (burst === 0) return;
    const delay = first.current ? 700 : 0; // the very first one waits for the heart-wipe to melt away
    first.current = false;
    const id = window.setTimeout(() => {
      const k = profile.confetti;
      spawn({ origin: [0, FLAME_Y + 0.35, 0], spread: 1, speed: 4.2, count: 130 * k, life: 3.4 });
      spawn({ origin: [-3.9, 0.45, 2.2], dir: [0.55, 1, -0.45], spread: 0.32, speed: 9.5, count: 90 * k, streamers: 0.32, life: 3.8 });
      spawn({ origin: [3.9, 0.45, 1.9], dir: [-0.6, 1, -0.4], spread: 0.32, speed: 9.5, count: 90 * k, streamers: 0.32, life: 3.8 });
    }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  useFrame((_, rawDt) => {
    const m = mesh.current;
    if (!m || S.active <= 0) return;
    const dt = Math.min(rawDt, 0.05);
    let any = 0;
    for (let i = 0; i < N; i++) {
      const L = S.life[i];
      if (L < 0) continue;
      const i3 = i * 3;
      S.life[i] = L + dt;
      if (S.life[i] > S.max[i]) {
        S.life[i] = -1;
        tmp.s.set(0, 0, 0);
        tmp.m.compose(tmp.p.set(0, -9, 0), tmp.q.identity(), tmp.s);
        m.setMatrixAt(i, tmp.m);
        continue;
      }
      any++;
      const drag = 1 - Math.min(1, 1.5 * dt);
      S.vel[i3] *= drag;
      S.vel[i3 + 2] *= drag;
      S.vel[i3 + 1] = S.vel[i3 + 1] * (1 - Math.min(1, 0.6 * dt)) - 5.4 * dt;
      S.vel[i3] += Math.sin(L * 9 + i) * 0.6 * dt;
      S.pos[i3] += S.vel[i3] * dt;
      S.pos[i3 + 1] += S.vel[i3 + 1] * dt;
      S.pos[i3 + 2] += S.vel[i3 + 2] * dt;
      if (S.pos[i3 + 1] < 0.03) {
        S.pos[i3 + 1] = 0.03;
        S.vel[i3 + 1] *= -0.15;
        S.vel[i3] *= 0.5;
        S.vel[i3 + 2] *= 0.5;
        S.spin[i3] *= 0.4;
        S.spin[i3 + 1] *= 0.4;
      }
      S.rot[i3] += S.spin[i3] * dt;
      S.rot[i3 + 1] += S.spin[i3 + 1] * dt;
      S.rot[i3 + 2] += S.spin[i3 + 2] * dt;
      const fade = Math.min(1, (S.max[i] - S.life[i]) / 0.7);
      tmp.e.set(S.rot[i3], S.rot[i3 + 1], S.rot[i3 + 2]);
      tmp.q.setFromEuler(tmp.e);
      tmp.s.set(S.sx[i] * fade, S.sy[i] * fade, fade);
      tmp.p.set(S.pos[i3], S.pos[i3 + 1], S.pos[i3 + 2]);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
    }
    m.instanceMatrix.needsUpdate = true;
    if (any === 0) S.active = 0;
  });

  // start with every instance parked out of sight
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    tmp.s.set(0, 0, 0);
    for (let i = 0; i < N; i++) {
      tmp.m.compose(tmp.p.set(0, -9, 0), tmp.q.identity(), tmp.s);
      m.setMatrixAt(i, tmp.m);
      m.setColorAt(i, tmp.c.set("#ffffff"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [N, tmp]);

  void candleCount;
  return (
    <instancedMesh ref={mesh} key={N} args={[undefined, undefined, N]} frustumCulled={false} userData={{ noShadow: true }}>
      <planeGeometry args={[0.08, 0.12]} />
      <meshBasicMaterial side={THREE.DoubleSide} color="#ffffff" toneMapped={false} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* glitter around the cake                                             */
/* ------------------------------------------------------------------ */
export function Glitter() {
  const profile = useProfile();
  const star = useMemo(() => starTexture(), []);
  return (
    <Twinkle
      count={Math.round(84 * profile.glitter) + 14}
      box={[0, 2.0, 0.1, 2.3, 1.5, 2.3]}
      size={[0.06, 0.15]}
      speed={[1.6, 4.2]}
      colors={["#fff2cf", "#ffc2dc"]}
      texture={star}
      intensity={1.6}
      drift={0.12}
      pulse={0.05}
      globalRef={rig}
      glowWhenDim={0.6}
    />
  );
}

/* ------------------------------------------------------------------ */
/* glossy hearts floating behind the table                             */
/* ------------------------------------------------------------------ */
function heartShape(s: number) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s);
  sh.bezierCurveTo(s * 1.25, s * 0.25, s * 0.62, s * 1.15, 0, s * 0.52);
  sh.bezierCurveTo(-s * 0.62, s * 1.15, -s * 1.25, s * 0.25, 0, -s);
  return sh;
}

export function FloatingHearts() {
  const profile = useProfile();
  const env = useEnv();
  const COUNT = profile.fancy ? 16 : 9;
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(heartShape(0.12), { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.018, bevelSegments: 2, curveSegments: 10 });
    g.center();
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const base = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      let x = (Math.random() * 2 - 1) * 5;
      const z = -4 + Math.random() * 3.6;
      if (Math.abs(x) < 1.6 && z > -2) x += x >= 0 ? 1.8 : -1.8;
      return {
        x, z,
        y0: 1.0 + Math.random() * 3.6,
        ph: Math.random() * Math.PI * 2,
        sp: 0.35 + Math.random() * 0.5,
        sc: 0.7 + Math.random() * 0.9,
        rot: Math.random() * 0.6 - 0.3,
        i,
      };
    });
  }, [COUNT]);
  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const colors = ["#ff5c9e", "#ff8fc0", "#e63f85", "#ffffff", "#ff9db8"];
    base.forEach((_, i) => m.setColorAt(i, new THREE.Color(colors[i % colors.length])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [base]);
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), []);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    const k = Math.min(1, Math.max(0, (sinceEntered() - 1.4) / 1.2));
    m.visible = k > 0;
    if (k <= 0) return;
    base.forEach((b, i) => {
      tmp.e.set(0, b.rot + Math.sin(t * b.sp + b.ph) * 0.45, Math.sin(t * b.sp * 0.7 + b.ph) * 0.2);
      tmp.q.setFromEuler(tmp.e);
      tmp.p.set(b.x, b.y0 + Math.sin(t * b.sp + b.ph) * 0.2 + (1 - k) * -0.8, b.z);
      tmp.s.setScalar(b.sc * k);
      tmp.m.compose(tmp.p, tmp.q, tmp.s);
      m.setMatrixAt(i, tmp.m);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} key={COUNT} args={[geo, undefined, COUNT]} frustumCulled={false} userData={{ noShadow: true }}>
      <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.1} envMap={env} envMapIntensity={1.0} />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */
/* the wish: stars and hearts rising with the smoke when flames go out */
/* ------------------------------------------------------------------ */
export function WishFx({ candleCount }: { candleCount: number }) {
  const candlesLit = useParty((s) => s.candlesLit);
  const prev = useRef(true);
  const star = useMemo(() => starTexture(), []);
  const heart = useMemo(() => heartTexture(), []);
  const N = 34;
  const group = useRef<THREE.Group>(null);
  const items = useRef(
    Array.from({ length: N }, () => ({ t0: -1, delay: 0, x: 0, z: 0, ph: 0, sp: 0.8, size: 0.2 }))
  );
  const origins = useMemo(() => candlePositions(candleCount), [candleCount]);

  useEffect(() => {
    if (prev.current && !candlesLit) {
      const now = performance.now() / 1000;
      items.current.forEach((it, i) => {
        const o = origins[i % origins.length];
        it.t0 = now;
        it.delay = 0.25 + (i / N) * 1.3 + Math.random() * 0.2;
        it.x = o.x + (Math.random() - 0.5) * 0.12;
        it.z = o.z + (Math.random() - 0.5) * 0.12;
        it.ph = Math.random() * 6.28;
        it.sp = 0.55 + Math.random() * 0.5;
        it.size = 0.12 + Math.random() * 0.2;
      });
    }
    prev.current = candlesLit;
  }, [candlesLit, origins]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const now = performance.now() / 1000;
    items.current.forEach((it, i) => {
      const s = g.children[i] as THREE.Sprite | undefined;
      if (!s) return;
      if (it.t0 < 0) {
        s.visible = false;
        return;
      }
      const t = now - it.t0 - it.delay;
      const life = 3.8;
      if (t < 0) {
        s.visible = false;
        return;
      }
      if (t > life) {
        it.t0 = -1;
        s.visible = false;
        return;
      }
      const p = t / life;
      s.visible = true;
      s.position.set(
        it.x + Math.sin(t * 1.6 + it.ph) * 0.22 * p,
        FLAME_Y - 0.2 + t * it.sp * 1.05 + Math.sin(p * 3) * 0.1,
        it.z + Math.cos(t * 1.3 + it.ph) * 0.18 * p
      );
      const sc = it.size * (0.5 + Math.sin(Math.min(1, p * 2.2) * Math.PI * 0.5) * 0.8) * (1 + Math.sin(t * 9 + it.ph) * 0.12);
      s.scale.set(sc, sc, 1);
      (s.material as THREE.SpriteMaterial).opacity = Math.pow(Math.sin(Math.PI * Math.min(1, p * 1.05)), 0.7) * 0.8;
    });
  });

  return (
    <group ref={group}>
      {Array.from({ length: N }, (_, i) => (
        <sprite key={i} visible={false} renderOrder={7}>
          <spriteMaterial
            map={i % 3 === 0 ? heart : star}
            color={new THREE.Color(...(i % 3 === 0 ? [1.5, 0.45, 0.85] : i % 2 ? [1.5, 1.25, 0.7] : [1.25, 0.9, 1.45]))}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
