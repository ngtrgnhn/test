import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useParty } from "../store";
import { useProfile } from "./quality";

/** shared, read-only-for-everyone-but-RigLights: 1 = party lights, ~0.5 = candle-lit mood */
export const rig = { level: 1 };

const BRIGHT_BG = new THREE.Color("#ffc9de");
const DIM_BG = new THREE.Color("#a04a78");

/**
 * The whole light rig in one place:
 *   hemisphere (pink sky / rose ground) + one warm key light that casts the shadows
 *   + a pink rim from behind + a soft fill from the front-left.
 * When every flame is out the room dims to a candle-lit mood (and fairy lights/windows shine more).
 */
export function RigLights() {
  const profile = useProfile();
  const scene = useThree((s) => s.scene);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const tmp = useMemo(() => new THREE.Color(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useParty.getState();
    const target = s.candlesLit ? 1 : 0.5;
    rig.level = THREE.MathUtils.damp(rig.level, target, 2.2, dt);
    const L = rig.level;
    if (hemi.current) hemi.current.intensity = 1.55 * L;
    if (key.current) key.current.intensity = 2.15 * L;
    if (rim.current) rim.current.intensity = 0.85 * L;
    if (fill.current) fill.current.intensity = 0.55 * L;
    const k = THREE.MathUtils.clamp((1 - L) / 0.5, 0, 1);
    tmp.copy(BRIGHT_BG).lerp(DIM_BG, k * 0.8);
    if (scene.background instanceof THREE.Color) scene.background.copy(tmp);
    if (scene.fog) scene.fog.color.copy(tmp);
  });

  const sm = profile.shadowMap;
  return (
    <>
      <hemisphereLight ref={hemi} args={["#fff2f7", "#f6a6c6", 1.55]} />
      <directionalLight
        key={`key-${profile.shadows}-${sm}`}
        ref={key}
        position={[4.6, 7.6, 5.2]}
        intensity={2.15}
        color="#fff0e0"
        castShadow={profile.shadows}
        shadow-mapSize={[sm, sm]}
        shadow-camera-left={-4.4}
        shadow-camera-right={4.4}
        shadow-camera-top={4.4}
        shadow-camera-bottom={-4.4}
        shadow-camera-near={2}
        shadow-camera-far={22}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <directionalLight ref={rim} position={[-6, 5, -5]} intensity={0.85} color="#ff8fc2" />
      <directionalLight ref={fill} position={[-4.5, 2.4, 6.5]} intensity={0.55} color="#ffd9ec" />
    </>
  );
}
