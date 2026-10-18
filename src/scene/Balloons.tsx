import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEnv } from "./Env";
import { useProfile } from "./quality";
import { Pop, easeOutBack, clamp01 } from "./anim";
import { fx } from "./fx";
import { balloonsPoppable } from "./interaction";
import { setCursor } from "../dom";
import { CANDY } from "./constants";
import { numeralTexture } from "./textures";

/* ------------------------------------------------------------------ */
/* one glossy latex balloon, tied to a weight on the floor              */
/* ------------------------------------------------------------------ */
function balloonGeometry() {
  const pts: THREE.Vector2[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI - (i / N) * Math.PI; // bottom → top
    const c = Math.cos(phi);
    const r = 0.3 * Math.sin(phi) * (1 - 0.2 * Math.pow(Math.max(0, -c), 2.2));
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), 0.35 * c * (c < 0 ? 1.04 : 1)));
  }
  return new THREE.LatheGeometry(pts, 32);
}

interface BalloonDef {
  color: string;
  size: number;
  len: number;
  leanX: number;
  leanZ: number;
  phase: number;
}

interface BunchDef {
  anchor: [number, number, number];
  delay: number;
  balloons: BalloonDef[];
}

const BUNCHES: BunchDef[] = [
  {
    anchor: [-3.55, 0.07, -0.7],
    delay: 0.6,
    balloons: [
      { color: "#ff6fae", size: 1.0, len: 3.05, leanX: -0.07, leanZ: 0.03, phase: 0 },
      { color: "#ffdcec", size: 0.9, len: 3.55, leanX: 0.06, leanZ: -0.05, phase: 1.3 },
      { color: "#8fd9ff", size: 0.88, len: 2.65, leanX: -0.16, leanZ: -0.06, phase: 2.1 },
      { color: "#ffd166", size: 0.82, len: 3.25, leanX: 0.14, leanZ: 0.07, phase: 3.4 },
    ],
  },
  {
    anchor: [3.35, 0.07, -1.55],
    delay: 0.78,
    balloons: [
      { color: "#b79cff", size: 1.0, len: 3.2, leanX: 0.05, leanZ: 0.02, phase: 0.7 },
      { color: "#ff8fc0", size: 0.92, len: 3.7, leanX: -0.07, leanZ: -0.06, phase: 1.9 },
      { color: "#7ee0c3", size: 0.84, len: 2.75, leanX: 0.15, leanZ: -0.04, phase: 2.8 },
      { color: "#ffdcec", size: 0.8, len: 3.35, leanX: -0.15, leanZ: 0.07, phase: 4.1 },
    ],
  },
  {
    anchor: [-4.9, 0.07, -3.0],
    delay: 0.95,
    balloons: [
      { color: "#ffd166", size: 1.0, len: 3.6, leanX: 0.02, leanZ: 0.03, phase: 0.2 },
      { color: "#ff6fae", size: 0.9, len: 3.0, leanX: -0.12, leanZ: -0.05, phase: 1.6 },
      { color: "#b79cff", size: 0.8, len: 4.0, leanX: 0.12, leanZ: 0.04, phase: 3.0 },
    ],
  },
  {
    anchor: [4.9, 0.07, -3.2],
    delay: 1.05,
    balloons: [
      { color: "#8fd9ff", size: 1.0, len: 3.7, leanX: -0.03, leanZ: 0.03, phase: 1.0 },
      { color: "#ffc4de", size: 0.9, len: 3.1, leanX: 0.12, leanZ: -0.05, phase: 2.2 },
      { color: "#ff6fae", size: 0.82, len: 4.05, leanX: -0.12, leanZ: 0.04, phase: 3.6 },
    ],
  },
];

function Balloon({
  def, geo, bunch, index,
}: { def: BalloonDef; geo: THREE.BufferGeometry; bunch: number; index: number }) {
  const env = useEnv();
  const tilt = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const bodyMesh = useRef<THREE.Mesh>(null);
  const popped = useRef(-1); // seconds since the pop, -1 = intact
  const grow = useRef(1);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime + def.phase * 3;
    if (tilt.current) {
      tilt.current.rotation.x = def.leanZ + Math.sin(t * 0.62) * 0.022;
      tilt.current.rotation.z = -def.leanX + Math.sin(t * 0.47 + 1) * 0.026;
    }
    if (popped.current >= 0) {
      popped.current += dt;
      if (popped.current > 3.2) {
        // a fresh one grows back from the knot
        grow.current = clamp01((popped.current - 3.2) / 0.9);
        const s = easeOutBack(grow.current, 1.6);
        if (body.current) {
          body.current.visible = true;
          body.current.scale.setScalar(Math.max(s * def.size, 0.0001));
        }
        if (grow.current >= 1) {
          popped.current = -1;
        }
      }
    }
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!balloonsPoppable() || popped.current >= 0) return;
    e.stopPropagation();
    const m = bodyMesh.current;
    if (m) {
      m.getWorldPosition(tmp);
      fx.burst({
        origin: [tmp.x, tmp.y, tmp.z],
        spread: 1,
        speed: 2.6,
        count: 34,
        colors: [def.color, "#ffffff", def.color, CANDY.butter],
        streamers: 0.15,
        life: 1.8,
        size: 0.85,
      });
    }
    if (body.current) body.current.visible = false;
    popped.current = 0;
    setCursor("");
  };

  return (
    <group ref={tilt}>
      {/* string */}
      <mesh position={[0, def.len / 2 - 0.05, 0]} userData={{ noShadow: true }}>
        <cylinderGeometry args={[0.0045, 0.0045, def.len - 0.3, 4]} />
        <meshBasicMaterial color="#e6a9c4" />
      </mesh>
      <group ref={body} position={[0, def.len, 0]} scale={def.size}>
        <mesh
          ref={bodyMesh}
          geometry={geo}
          position={[0, 0.36, 0]}
          onClick={onClick}
          onPointerOver={(e) => {
            if (!balloonsPoppable() || popped.current >= 0) return;
            e.stopPropagation();
            setCursor("pointer");
          }}
          onPointerOut={() => setCursor("")}
          castShadow
        >
          <meshStandardMaterial color={def.color} roughness={0.2} metalness={0.05} envMap={env} envMapIntensity={0.85} />
        </mesh>
        {/* knot */}
        <mesh position={[0, 0.018, 0]} rotation={[Math.PI, 0, 0]} userData={{ noShadow: true }}>
          <coneGeometry args={[0.04, 0.075, 10]} />
          <meshStandardMaterial color={def.color} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.76, 0]} userData={{ noShadow: true }} visible={false}>
          <sphereGeometry args={[0.01]} />
        </mesh>
      </group>
    </group>
  );
}

function Bunch({ def, geo, index }: { def: BunchDef; geo: THREE.BufferGeometry; index: number }) {
  return (
    <Pop delay={def.delay} dur={1.15} ease="elastic" origin={def.anchor} from={0.05}>
      <group position={def.anchor}>
        {def.balloons.map((b, i) => (
          <Balloon key={i} def={b} geo={geo} bunch={index} index={i} />
        ))}
        {/* the weight: a little gold coin-stack with a bow */}
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.09, 20]} />
          <meshStandardMaterial color="#ffdf9a" roughness={0.42} metalness={0.25} />
        </mesh>
        <mesh position={[0, 0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.1, 0.02, 8, 20]} />
          <meshStandardMaterial color="#ff6fae" roughness={0.5} />
        </mesh>
      </group>
    </Pop>
  );
}

export function Balloons() {
  const geo = useMemo(() => balloonGeometry(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group>
      {BUNCHES.map((b, i) => (
        <Bunch key={i} def={b} geo={geo} index={i} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* foil numerals of the age (follows recipient.age in config.json)     */
/* ------------------------------------------------------------------ */
function Numeral({ digit, position, rot, delay, phase }: { digit: string; position: [number, number, number]; rot: number; delay: number; phase: number }) {
  const env = useEnv();
  const height = position[1];
  const tex = useMemo(() => numeralTexture(digit), [digit]);
  const sway = useRef<THREE.Group>(null);
  useEffect(() => () => tex.dispose(), [tex]);
  useFrame((state) => {
    const t = state.clock.elapsedTime + phase;
    if (sway.current) {
      sway.current.rotation.z = Math.sin(t * 0.7) * 0.05;
      sway.current.rotation.y = rot + Math.sin(t * 0.5) * 0.1;
      sway.current.position.y = height + Math.sin(t * 0.9) * 0.05;
    }
  });
  return (
    <Pop delay={delay} dur={1.1} ease="elastic" origin={[position[0], 0.05, position[2]]} from={0.05}>
      <group position={[position[0], 0, position[2]]}>
        {/* ribbon to the weight */}
        <mesh position={[0, position[1] / 2, 0]} userData={{ noShadow: true }}>
          <cylinderGeometry args={[0.006, 0.006, position[1] - 0.6, 4]} />
          <meshBasicMaterial color="#ffb3d1" />
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.12, 20]} />
          <meshStandardMaterial color="#ffdf9a" roughness={0.42} metalness={0.25} />
        </mesh>
        <group ref={sway} position={[0, position[1], 0]}>
          <mesh castShadow>
            <planeGeometry args={[1.5, 1.5]} />
            <meshStandardMaterial
              map={tex}
              transparent
              alphaTest={0.4}
              roughness={0.25}
              metalness={0.45}
              envMap={env}
              envMapIntensity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
    </Pop>
  );
}

export function Numerals({ age }: { age: number }) {
  const digits = String(Math.max(0, Math.round(age))).slice(0, 3).split("");
  const profile = useProfile();
  if (!profile.fancy && digits.length > 2) digits.length = 2;
  const x0 = 3.05;
  return (
    <group>
      {digits.map((d, i) => (
        <Numeral
          key={`${i}-${digits.length}`}
          digit={d}
          position={[x0 + i * 1.22 + 0.5, 2.25 + (i % 2) * 0.16, -0.05 - i * 0.2]}
          rot={0.32}
          delay={1.15 + i * 0.16}
          phase={i * 1.7}
        />
      ))}
    </group>
  );
}
