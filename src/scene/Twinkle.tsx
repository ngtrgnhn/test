import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Thousands-of-sparkles-for-free: one instanced draw call of camera-facing quads that twinkle,
 * drift and glow (additive). Colours may exceed 1.0 so the bloom pass picks them up.
 * Used for glitter, dust motes, bokeh lamps and the halos of the fairy lights.
 */
const VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec4 aData;            // x phase, y size, z speed, w colour mix
  uniform float uTime;
  uniform float uDrift;
  uniform float uPulse;
  uniform float uGlobal;
  varying vec2 vUv;
  varying float vTw;
  varying float vMix;
  void main() {
    vUv = uv;
    float ph = aData.x;
    float sp = aData.z;
    float tw = 0.5 + 0.5 * sin(uTime * sp + ph * 6.2831);
    vTw = mix(uPulse, 1.0, tw * tw) * uGlobal;
    vMix = aData.w;
    vec3 p = aOffset;
    p.y += sin(uTime * 0.25 * sp + ph * 12.0) * uDrift;
    p.x += cos(uTime * 0.21 * sp + ph * 9.0) * uDrift * 0.6;
    p.z += sin(uTime * 0.17 * sp + ph * 7.0) * uDrift * 0.4;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    mv.xy += position.xy * aData.y * mix(0.7, 1.15, tw);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uIntensity;
  varying vec2 vUv;
  varying float vTw;
  varying float vMix;
  void main() {
    float a = texture2D(uMap, vUv).a * vTw;
    vec3 col = mix(uColorA, uColorB, vMix) * uIntensity;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

export interface TwinkleProps {
  count: number;
  /** [cx, cy, cz, rx, ry, rz] — scatter inside this box (ignored when `positions` is given) */
  box?: [number, number, number, number, number, number];
  positions?: THREE.Vector3[];
  size?: [number, number];
  speed?: [number, number];
  colors?: [THREE.ColorRepresentation, THREE.ColorRepresentation];
  texture: THREE.Texture;
  intensity?: number;
  drift?: number;
  /** darkest point of the twinkle (0 = fully off, 1 = steady) */
  pulse?: number;
  /** extra brightness multiplier that follows the room (e.g. brighter when the lights dim) */
  globalRef?: { level: number };
  glowWhenDim?: number;
  renderOrder?: number;
}

export function Twinkle({
  count,
  box = [0, 2, 0, 3, 2, 3],
  positions,
  size = [0.08, 0.16],
  speed = [1, 3],
  colors = ["#fff4dc", "#ffd1e6"],
  texture,
  intensity = 1,
  drift = 0.08,
  pulse = 0.1,
  globalRef,
  glowWhenDim = 0,
  renderOrder = 5,
}: TwinkleProps) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const n = positions ? positions.length : count;
    const g = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    g.index = plane.index;
    g.setAttribute("position", plane.getAttribute("position"));
    g.setAttribute("uv", plane.getAttribute("uv"));
    const off = new Float32Array(n * 3);
    const dat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      if (positions) {
        off[i * 3] = positions[i].x;
        off[i * 3 + 1] = positions[i].y;
        off[i * 3 + 2] = positions[i].z;
      } else {
        off[i * 3] = box[0] + (Math.random() * 2 - 1) * box[3];
        off[i * 3 + 1] = box[1] + (Math.random() * 2 - 1) * box[4];
        off[i * 3 + 2] = box[2] + (Math.random() * 2 - 1) * box[5];
      }
      dat[i * 4] = Math.random();
      dat[i * 4 + 1] = size[0] + Math.random() * (size[1] - size[0]);
      dat[i * 4 + 2] = speed[0] + Math.random() * (speed[1] - speed[0]);
      dat[i * 4 + 3] = Math.random();
    }
    g.setAttribute("aOffset", new THREE.InstancedBufferAttribute(off, 3));
    g.setAttribute("aData", new THREE.InstancedBufferAttribute(dat, 4));
    g.instanceCount = n;
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, positions]);

  useEffect(() => () => geo.dispose(), [geo]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDrift: { value: drift },
      uPulse: { value: pulse },
      uGlobal: { value: 1 },
      uMap: { value: texture },
      uColorA: { value: new THREE.Color(colors[0]) },
      uColorB: { value: new THREE.Color(colors[1]) },
      uIntensity: { value: intensity },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [texture]
  );

  useFrame((state) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.elapsedTime;
    if (globalRef && glowWhenDim) m.uniforms.uGlobal.value = 1 + (1 - globalRef.level) * glowWhenDim;
  });

  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={renderOrder} userData={{ noShadow: true }}>
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}
