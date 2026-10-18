import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A small hand-made "pink studio" that glossy materials (balloons, topper, porcelain, glass…)
 * reflect: soft boxes + a warm candle-coloured spot. Converted once with PMREM.
 * Materials opt in through `envMap={useEnv()}` — the rest of the scene is unaffected.
 */
const EnvCtx = createContext<THREE.Texture | null>(null);
export const useEnv = () => useContext(EnvCtx);

function buildStudio(): THREE.Scene {
  const s = new THREE.Scene();
  // gradient dome
  const dome = new THREE.SphereGeometry(30, 32, 16);
  const colors: number[] = [];
  const pos = dome.getAttribute("position");
  const top = new THREE.Color("#ffeaf4");
  const mid = new THREE.Color("#ff9cc6");
  const bot = new THREE.Color("#7a2c55");
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 30;
    if (y > 0) c.copy(mid).lerp(top, Math.pow(y, 0.8));
    else c.copy(mid).lerp(bot, Math.pow(-y, 0.7));
    colors.push(c.r, c.g, c.b);
  }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  s.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));

  const box = (w: number, h: number, p: [number, number, number], col: THREE.ColorRepresentation, k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })
    );
    m.position.set(...p);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  box(14, 9, [12, 16, 14], "#ffffff", 2.8); // key soft box (upper right, front)
  box(3, 16, [-20, 6, -8], "#ffd0e6", 2.1); // tall rim strip, left-back
  box(10, 3, [0, 22, -6], "#ffffff", 1.8); // overhead strip
  box(5, 5, [-10, 4, 18], "#ffb36b", 1.4); // warm candle-ish spot, front-left
  box(6, 6, [20, 3, -12], "#c6e8ff", 1.3); // cool window light, right-back
  return s;
}

export function EnvProvider({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let rt: THREE.WebGLRenderTarget | null = null;
    try {
      const pm = new THREE.PMREMGenerator(gl);
      const studio = buildStudio();
      rt = pm.fromScene(studio, 0.04);
      setTex(rt.texture);
      pm.dispose();
      studio.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
    } catch (e) {
      console.warn("[party] environment map skipped:", e);
    }
    return () => {
      rt?.dispose();
    };
  }, [gl]);

  return <EnvCtx.Provider value={tex}>{children}</EnvCtx.Provider>;
}
