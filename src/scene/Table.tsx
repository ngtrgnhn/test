import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TABLE_H, TABLE_R, SKIRT_FLARE, CANDY, PASTEL } from "./constants";
import { toonGradient, laceTexture, blobShadowTexture, glowTexture } from "./textures";
import { useEnv } from "./Env";
import { Pop } from "./anim";
import { rig } from "./Lights";
import { StaticBatch } from "./StaticBatch";

export function BlobShadow({
  position, scale = 1, opacity = 1,
}: { position: [number, number, number]; scale?: number; opacity?: number }) {
  const tex = useMemo(() => blobShadowTexture(), []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={scale} renderOrder={1} userData={{ noShadow: true }}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* table: lace over a pleated, scalloped cloth                         */
/* ------------------------------------------------------------------ */
function skirtGeometry() {
  const H = TABLE_H - 0.04;
  const g = new THREE.CylinderGeometry(TABLE_R + 0.02, TABLE_R + SKIRT_FLARE, H, 144, 18, true);
  const pos = g.getAttribute("position");
  const N = 22; // scallops
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const v = (H / 2 - y) / H; // 0 under the top → 1 at the hem
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z);
    const pleat = Math.sin(a * 30) * 0.045 * (0.1 + 0.9 * v) + Math.sin(a * 13 + 1.3) * 0.02 * v;
    const k = (r + pleat) / Math.max(r, 0.0001);
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
    pos.setY(i, y + 0.1 * (1 - Math.abs(Math.sin((a * N) / 2))) * Math.pow(v, 5));
  }
  g.computeVertexNormals();
  return g;
}

export function Table() {
  const lace = useMemo(() => laceTexture(), []);
  const env = useEnv();
  const skirt = useMemo(() => skirtGeometry(), []);
  return (
    <StaticBatch><group>
      {/* table top (under the lace) */}
      <mesh position={[0, TABLE_H - 0.03, 0]}>
        <cylinderGeometry args={[TABLE_R + 0.05, TABLE_R + 0.05, 0.06, 80]} />
        <meshStandardMaterial color="#ffe9f1" roughness={0.8} />
      </mesh>
      {/* cloth */}
      <mesh geometry={skirt} position={[0, (TABLE_H - 0.04) / 2, 0]}>
        <meshStandardMaterial color="#ff7fb1" roughness={0.82} side={THREE.DoubleSide} envMap={env} envMapIntensity={0.25} />
      </mesh>
      {/* lace doily on top */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_H + 0.004, 0]} receiveShadow>
        <circleGeometry args={[TABLE_R + 0.1, 96]} />
        <meshStandardMaterial map={lace} alphaTest={0.5} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {/* hem trim */}
      <mesh position={[0, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ noShadow: true }}>
        <torusGeometry args={[TABLE_R + SKIRT_FLARE - 0.02, 0.025, 6, 96]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      <BlobShadow position={[0, 0.01, 0]} scale={4.4} opacity={0.75} />
    </group></StaticBatch>
  );
}

/* ------------------------------------------------------------------ */
/* gifts                                                               */
/* ------------------------------------------------------------------ */
function GiftBox({
  size, box, ribbon, rot,
}: { size: number; box: string; ribbon: string; rot: number }) {
  const grad = useMemo(() => toonGradient(), []);
  const s = size;
  const h = s * 0.72;
  const lidH = s * 0.16;
  const mBox = <meshToonMaterial color={box} gradientMap={grad} />;
  const mRib = <meshToonMaterial color={ribbon} gradientMap={grad} />;
  return (
    <StaticBatch><group rotation={[0, rot, 0]}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[s, h, s]} />
        {mBox}
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[s * 0.2, h + 0.004, s + 0.006]} />
        {mRib}
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[s + 0.006, h + 0.004, s * 0.2]} />
        {mRib}
      </mesh>
      <mesh position={[0, h + lidH / 2, 0]}>
        <boxGeometry args={[s * 1.1, lidH, s * 1.1]} />
        {mBox}
      </mesh>
      <mesh position={[0, h + lidH / 2, 0]}>
        <boxGeometry args={[s * 0.2, lidH + 0.004, s * 1.11]} />
        {mRib}
      </mesh>
      <mesh position={[0, h + lidH / 2, 0]}>
        <boxGeometry args={[s * 1.11, lidH + 0.004, s * 0.2]} />
        {mRib}
      </mesh>
      <group position={[0, h + lidH + 0.02, 0]} scale={s / 0.44 + 0.2}>
        <mesh position={[0.07, 0.04, 0]} rotation={[Math.PI / 2, 0.5, 0.5]}>
          <torusGeometry args={[0.065, 0.026, 8, 18]} />
          {mRib}
        </mesh>
        <mesh position={[-0.07, 0.04, 0]} rotation={[Math.PI / 2, -0.5, -0.5]}>
          <torusGeometry args={[0.065, 0.026, 8, 18]} />
          {mRib}
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.035, 10, 10]} />
          {mRib}
        </mesh>
      </group>
      <BlobShadow position={[0, 0.006, 0]} scale={s * 2.6} opacity={0.65} />
    </group></StaticBatch>
  );
}

function Teddy() {
  const grad = useMemo(() => toonGradient(), []);
  const head = useRef<THREE.Group>(null);
  const fur = "#e9b68c";
  const light = "#fbe0c6";
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.9) * 0.07;
      head.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.03;
    }
  });
  const M = (c: string) => <meshToonMaterial color={c} gradientMap={grad} />;
  return (
    <group>
      <mesh position={[0, 0.26, 0]} scale={[1, 1.08, 0.95]}>
        <sphereGeometry args={[0.24, 20, 16]} />
        {M(fur)}
      </mesh>
      <mesh position={[0, 0.25, 0.185]} scale={[1, 1.15, 0.5]}>
        <sphereGeometry args={[0.15, 16, 12]} />
        {M(light)}
      </mesh>
      {/* legs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.15, 0.1, 0.17]} rotation={[-0.2, 0, s * 0.2]} scale={[1, 0.9, 1.25]}>
          <sphereGeometry args={[0.1, 14, 10]} />
          {M(fur)}
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`p${s}`} position={[s * 0.15, 0.1, 0.27]} scale={[1, 0.6, 0.6]}>
          <sphereGeometry args={[0.055, 10, 8]} />
          {M(light)}
        </mesh>
      ))}
      {/* arms */}
      {[-1, 1].map((s) => (
        <mesh key={`a${s}`} position={[s * 0.25, 0.32, 0.06]} rotation={[0.2, 0, s * 0.7]} scale={[0.75, 1.2, 0.75]}>
          <sphereGeometry args={[0.085, 12, 10]} />
          {M(fur)}
        </mesh>
      ))}
      {/* head */}
      <group ref={head} position={[0, 0.58, 0.02]}>
        <mesh>
          <sphereGeometry args={[0.19, 20, 16]} />
          {M(fur)}
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.14, 0.15, 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 12, 10]} />
              {M(fur)}
            </mesh>
            <mesh position={[0, 0, 0.03]} scale={[1, 1, 0.6]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              {M("#ff9db8")}
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.04, 0.15]} scale={[1.1, 0.85, 0.9]}>
          <sphereGeometry args={[0.085, 14, 10]} />
          {M(light)}
        </mesh>
        <mesh position={[0, -0.01, 0.225]}>
          <sphereGeometry args={[0.026, 10, 8]} />
          <meshStandardMaterial color="#3a1a28" roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.07, 0.04, 0.165]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#3a1a28" roughness={0.3} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`c${s}`} position={[s * 0.12, -0.04, 0.14]} scale={[1, 0.6, 0.4]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshBasicMaterial color="#ff9db8" transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      {/* bow tie */}
      <group position={[0, 0.43, 0.15]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.05, 0, 0]} rotation={[0, 0, (s * Math.PI) / 2]}>
            <coneGeometry args={[0.04, 0.07, 8]} />
            {M(CANDY.punch)}
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.022, 8, 8]} />
          {M(CANDY.punchDeep)}
        </mesh>
      </group>
      <BlobShadow position={[0, 0.006, 0.05]} scale={0.8} opacity={0.65} />
    </group>
  );
}

export function Gifts() {
  const items: { p: [number, number, number]; size: number; box: string; ribbon: string; rot: number; delay: number }[] = [
    { p: [2.1, 0, 1.2], size: 0.5, box: "#ffd9e8", ribbon: "#ff5c9e", rot: 0.35, delay: 0.75 },
    { p: [2.7, 0, 0.45], size: 0.36, box: "#ffd166", ribbon: "#ff8fc0", rot: -0.55, delay: 0.9 },
    { p: [2.35, 0, 1.95], size: 0.3, box: "#b79cff", ribbon: "#fff7ec", rot: 0.9, delay: 1.05 },
    { p: [-3.05, 0, -0.1], size: 0.46, box: "#8fe3c6", ribbon: "#fff7ec", rot: 0.8, delay: 0.82 },
    { p: [-3.95, 0, -0.2], size: 0.32, box: "#ff9ec6", ribbon: "#ffd166", rot: -0.25, delay: 0.98 },
  ];
  return (
    <group>
      {items.map((g, i) => (
        <Pop key={i} delay={g.delay} dur={0.9} ease="bounce" mode="drop" rise={2.6} origin={g.p}>
          <group position={g.p}>
            <GiftBox size={g.size} box={g.box} ribbon={g.ribbon} rot={g.rot} />
          </group>
        </Pop>
      ))}
      <Pop delay={1.15} dur={0.9} ease="bounce" mode="drop" rise={2.4} origin={[-3.4, 0, 2.6]}>
        <group position={[-3.4, 0, 2.6]} rotation={[0, 0.9, 0]}>
          <Teddy />
        </group>
      </Pop>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* things on the table                                                 */
/* ------------------------------------------------------------------ */
function Cupcake({ color, frost }: { color: string; frost: string }) {
  const grad = useMemo(() => toonGradient(), []);
  return (
    <StaticBatch><group>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.072, 0.052, 0.09, 16]} />
        <meshToonMaterial color={color} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 0.11, 0]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.075, 14, 10]} />
        <meshToonMaterial color={frost} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 0.15, 0]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.055, 14, 10]} />
        <meshToonMaterial color={frost} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 0.19, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.035, 12, 8]} />
        <meshToonMaterial color={frost} gradientMap={grad} />
      </mesh>
      <mesh position={[0, 0.222, 0]}>
        <sphereGeometry args={[0.021, 10, 8]} />
        <meshStandardMaterial color="#e5223f" roughness={0.18} />
      </mesh>
    </group></StaticBatch>
  );
}

function TeaLight({ color }: { color: string }) {
  const flame = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const glow = useMemo(() => glowTexture(), []);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame((state) => {
    const t = state.clock.elapsedTime + seed;
    const k = 0.9 + Math.sin(t * 9) * 0.1 + Math.sin(t * 15) * 0.05;
    if (flame.current) flame.current.scale.set(1, k * 1.1, 1);
    if (halo.current) {
      const m = halo.current.material as THREE.SpriteMaterial;
      m.opacity = (0.5 + (1 - rig.level) * 0.35) * k;
    }
  });
  return (
    <group>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry args={[0.062, 0.058, 0.09, 18, 1, true]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} roughness={0.08} metalness={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 14]} />
        <meshBasicMaterial color="#fff6e4" />
      </mesh>
      <mesh ref={flame} position={[0, 0.075, 0]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color={new THREE.Color(3, 1.7, 0.5)} toneMapped={false} />
      </mesh>
      <sprite ref={halo} position={[0, 0.08, 0]} scale={0.34}>
        <spriteMaterial map={glow} color={new THREE.Color(1.4, 0.7, 0.3)} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
    </group>
  );
}

function Vase({ flowers }: { flowers: string[] }) {
  const grad = useMemo(() => toonGradient(), []);
  const env = useEnv();
  const stems = useMemo(
    () =>
      flowers.map((c, i) => {
        const a = (i / flowers.length) * Math.PI * 2;
        const lean = 0.22 + (i % 2) * 0.12;
        return { c, a, lean, h: 0.26 + (i % 3) * 0.04 };
      }),
    [flowers]
  );
  return (
    <StaticBatch><group>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.055, 0.08, 0.14, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.12} envMap={env} envMapIntensity={0.9} />
      </mesh>
      {stems.map((s, i) => (
        <group key={i} rotation={[Math.sin(s.a) * s.lean, 0, -Math.cos(s.a) * s.lean]} position={[0, 0.13, 0]}>
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.006, 0.006, s.h, 5]} />
            <meshToonMaterial color="#7bc47f" gradientMap={grad} />
          </mesh>
          <group position={[0, s.h, 0]}>
            {[0, 1, 2, 3, 4].map((p) => (
              <mesh
                key={p}
                position={[Math.cos((p * Math.PI * 2) / 5) * 0.034, 0, Math.sin((p * Math.PI * 2) / 5) * 0.034]}
                scale={[1, 0.7, 1]}
              >
                <sphereGeometry args={[0.03, 8, 6]} />
                <meshToonMaterial color={s.c} gradientMap={grad} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.022, 8, 6]} />
              <meshToonMaterial color={CANDY.butter} gradientMap={grad} />
            </mesh>
          </group>
        </group>
      ))}
    </group></StaticBatch>
  );
}

export function TableSettings() {
  const grad = useMemo(() => toonGradient(), []);
  const ring = TABLE_R - 0.22;
  const at = (deg: number, r = ring): [number, number, number] => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, TABLE_H + 0.006, Math.sin(a) * r];
  };
  const plates = [
    { deg: 38, cake: ["#ffd3e5", "#ff8fc0"] },
    { deg: 150, cake: ["#fff0dc", "#ffffff"] },
    { deg: 198, cake: ["#d9ecff", "#8fd9ff"] },
    { deg: 332, cake: ["#e6dcff", "#b79cff"] },
  ];
  return (
    <group>
      {plates.map((p, i) => (
        <Pop key={i} delay={0.9 + i * 0.1} dur={0.55} origin={at(p.deg)}>
          <group position={at(p.deg)} rotation={[0, -((p.deg * Math.PI) / 180) + Math.PI / 2, 0]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.17, 0.022, 28]} />
              <meshStandardMaterial color="#ffffff" roughness={0.25} />
            </mesh>
            <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.155, 0.175, 32]} />
              <meshBasicMaterial color={CANDY.gold} />
            </mesh>
            <group position={[0, 0.011, 0]}>
              <Cupcake color={p.cake[0]} frost={p.cake[1]} />
            </group>
            <mesh position={[0.29, 0.013, 0.02]} rotation={[0, 0.1, 0]}>
              <boxGeometry args={[0.014, 0.008, 0.2]} />
              <meshStandardMaterial color="#d9d9e2" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[-0.29, 0.011, 0.02]} rotation={[0, -0.1, 0]}>
              <boxGeometry args={[0.012, 0.006, 0.19]} />
              <meshStandardMaterial color="#d9d9e2" roughness={0.2} metalness={0.8} />
            </mesh>
            <mesh position={[-0.2, 0.004, -0.13]} rotation={[0, 0.5, 0]}>
              <boxGeometry args={[0.12, 0.006, 0.12]} />
              <meshToonMaterial color={PASTEL[i % PASTEL.length]} gradientMap={grad} />
            </mesh>
          </group>
        </Pop>
      ))}

      {/* tea lights in glass jars */}
      {[
        { deg: 88, c: "#ffd6ea" },
        { deg: 262, c: "#d6f5ea" },
        { deg: 22, c: "#fff0c2" },
        { deg: 238, c: "#e6dcff" },
      ].map((l, i) => (
        <Pop key={`t${i}`} delay={1.2 + i * 0.1} dur={0.5} origin={at(l.deg, ring + 0.02)}>
          <group position={at(l.deg, ring + 0.02)}>
            <TeaLight color={l.c} />
          </group>
        </Pop>
      ))}

      <Pop delay={1.1} dur={0.6} origin={at(305, ring + 0.02)}>
        <group position={at(305, ring + 0.02)}>
          <Vase flowers={[CANDY.candy, "#ffffff", CANDY.punch, "#ffd9a8", "#d9c6ff"]} />
        </group>
      </Pop>
      <Pop delay={1.18} dur={0.6} origin={at(112, ring + 0.02)}>
        <group position={at(112, ring + 0.02)} scale={0.9}>
          <Vase flowers={["#ffd166", "#ff9ec6", "#ffffff", "#8fd9ff"]} />
        </group>
      </Pop>
    </group>
  );
}
