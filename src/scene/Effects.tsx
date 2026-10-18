import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { useParty } from "../store";
import { DEBUG } from "../dom";
import { PROFILES, useQuality } from "./quality";

function canRenderHdr(gl: THREE.WebGLRenderer): boolean {
  try {
    const ext = gl.extensions;
    return !!gl.capabilities.isWebGL2 && (ext.has("EXT_color_buffer_float") || ext.has("EXT_color_buffer_half_float"));
  } catch {
    return false;
  }
}

/**
 * Bloom: flames, fairy lights, glitter and glossy highlights glow softly.
 * Renders the scene into a half-float target (so emissive colours may exceed 1.0),
 * blooms what is brighter than the threshold, then tone-maps/sRGB-converts once at the end.
 * If the GPU cannot do that, or the tier is "low", nothing is mounted and R3F renders normally.
 */
export function Effects() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const tier = useQuality((s) => s.tier);
  const profile = PROFILES[tier];
  const [composer, setComposer] = useState<EffectComposer | null>(null);
  const bloomRef = useRef<UnrealBloomPass | null>(null);

  const enabled = profile.bloom && canRenderHdr(gl);

  useEffect(() => {
    if (!enabled) {
      setComposer(null);
      return;
    }
    let c: EffectComposer | null = null;
    try {
      const rt = new THREE.WebGLRenderTarget(Math.max(1, size.width), Math.max(1, size.height), {
        type: THREE.HalfFloatType,
        // a 2x-density screen is already smooth: half the samples keeps the memory/fill cost sane
        samples: dpr >= 1.75 ? Math.min(profile.msaa, 2) : profile.msaa,
      });
      c = new EffectComposer(gl, rt);
      c.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), profile.bloomStrength, 0.5, 1.85);
      bloomRef.current = bloom;
      if (DEBUG) (window as unknown as { __fx?: unknown }).__fx = { bloom, composer: c };
      c.addPass(bloom);
      c.addPass(new OutputPass());
      setComposer(c);
    } catch (e) {
      console.warn("[party] bloom disabled:", e);
      setComposer(null);
    }
    return () => {
      bloomRef.current = null;
      if (c) {
        c.passes.forEach((p) => p.dispose?.());
        c.dispose();
      }
      setComposer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, enabled, profile.msaa, profile.bloomStrength, dpr >= 1.75]);

  useEffect(() => {
    if (!composer) return;
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
  }, [composer, size.width, size.height, dpr]);

  // priority > 0 → we own the render call; priority 0 → R3F renders on its own
  useFrame(() => {
    if (composer) composer.render();
  }, composer ? 1 : 0);

  return null;
}

/**
 * Frame-rate guard: unless the author pinned a tier, drop one tier when the
 * party runs below ~27 fps for a few seconds (at most twice per visit).
 */
export function PerfGuard() {
  const st = useRef({ t: 0, n: 0, warm: 0, cool: 0 });
  useFrame((_, dt) => {
    const q = useQuality.getState();
    const a = st.current;
    const phase = useParty.getState().phase;
    if (q.locked) return;
    if (phase === "loading" || phase === "intro") {
      a.t = a.n = a.warm = a.cool = 0;
      return;
    }
    if (document.hidden || useParty.getState().panel || dt > 0.5) return;
    a.warm += dt;
    if (a.warm < 3.5) return; // shader compilation + the entrance animation do not count
    if (a.cool > 0) {
      a.cool -= dt;
      return;
    }
    a.t += dt;
    a.n++;
    if (a.t >= 2.5) {
      const fps = a.n / a.t;
      a.t = 0;
      a.n = 0;
      if (fps < 27 && q.stepDown()) {
        a.cool = 4;
        console.info(`[party] ${fps.toFixed(0)} fps → quality: ${useQuality.getState().tier}`);
      }
    }
  });
  return null;
}


/** Static lighting does not need a new shadow map at the full display frame rate. */
export function ShadowBudget() {
  const gl = useThree(s => s.gl);
  const tier = useQuality(s => s.tier);
  const accumulator = useRef(0);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => { gl.shadowMap.autoUpdate = true; };
  }, [gl, tier]);
  useFrame((_, dt) => {
    accumulator.current += Math.min(dt, .1);
    const s = useParty.getState();
    const hz = s.phase === 'party' ? 12 : 24;
    if (accumulator.current >= 1 / hz) {
      gl.shadowMap.needsUpdate = true;
      accumulator.current = 0;
    }
  });
  return null;
}
