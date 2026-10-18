import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useParty } from '../store';
import { useQuality } from './quality';
import { clamp01, easeOutCubic, sinceEntered } from './anim';
import { overviewDistance } from './constants';
import { keepsakePosition, PANEL_TIMING, smoothProgress } from './keepsakeLayout';

const poses = {
  overview: { target: [0, 2.05, 0.1], radius: 3.1, width: 4.1, fov: 42, dir: [0.55, 0.3, 1] },
  approach: { target: [-0.6, 1.9, 0.4], radius: 1.9, width: 2.4, fov: 40, dir: [-0.2, 0.28, 1] },
  blowing: { target: [-0.85, 2.2, 0.3], radius: 1.45, width: 2.1, fov: 34, dir: [-0.18, 0.2, 1] },
  blown: { target: [-0.85, 2.05, 0.5], radius: 2, width: 2.45, fov: 38, dir: [-0.15, 0.24, 1] },
};

/** Orbit in browsing mode; take over for the ceremony; restore the visitor's previous view. */
export function CameraRig() {
  const { camera: baseCamera, gl, size, invalidate } = useThree();
  const camera = baseCamera as THREE.PerspectiveCamera;
  const controls = useRef<OrbitControls | null>(null);
  const state = useRef({
    placed: false, orbit: false, lastPhase: 'loading', reset: 0, holdUntil: 0,
    pos: new THREE.Vector3(), target: new THREE.Vector3(), dir: new THREE.Vector3(),
    savedPos: new THREE.Vector3(), savedTarget: new THREE.Vector3(), saved: false,
    panelStage:'idle', tweenStart:0, startPos:new THREE.Vector3(), startTarget:new THREE.Vector3(),
    focusPos:new THREE.Vector3(), focusTarget:new THREE.Vector3(), returnPos:new THREE.Vector3(), returnTarget:new THREE.Vector3(),
    startFov:42, returnFov:42,
  });

  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.075;
    c.enablePan = false;
    c.rotateSpeed = 0.6;
    c.zoomSpeed = 0.6;
    c.minPolarAngle = 0.62;
    c.maxPolarAngle = 1.48;
    c.enabled = false;
    const changed = () => invalidate();
    c.addEventListener('change', changed);
    controls.current = c;
    return () => { c.removeEventListener('change', changed); c.dispose(); controls.current = null; };
  }, [camera, gl, invalidate]);

  useFrame((_, rawDt) => {
    const c = controls.current;
    if (!c) return;
    const s = useParty.getState();
    const a = state.current;
    const dt = Math.min(rawDt, 0.05);
    const reduce = useQuality.getState().reduceMotion;
    const now = performance.now();
    const aspect = size.width / Math.max(size.height, 1);
    if (a.lastPhase !== s.phase) {
      if (s.phase === 'party') a.holdUntil = now + (s.enteredAt !== null && now - s.enteredAt < 3500 ? 3500 : reduce ? 0 : 1250);
      a.orbit = false;
      a.lastPhase = s.phase;
    }
    if (a.reset !== s.resetView) {
      a.reset = s.resetView;
      a.saved = false;
      a.orbit = false;
      a.holdUntil = now + (reduce ? 0 : 1250);
    }
    c.enabled = s.phase === 'party' && !s.panel && a.orbit;
    c.minDistance = overviewDistance(aspect) * 0.64;
    c.maxDistance = overviewDistance(aspect) * 1.45;
    c.enableDamping = !reduce;
    // Snapshot the exact orbit before focusing. Hold it until close has animated out.
    if (s.panel && s.panelStage !== 'idle') {
      if (a.panelStage !== s.panelStage) {
        a.panelStage = s.panelStage;
        a.tweenStart = now;
        a.startPos.copy(camera.position); a.startTarget.copy(c.target); a.startFov = camera.fov;
        if (s.panelStage === 'zooming-in') {
          a.returnPos.copy(camera.position); a.returnTarget.copy(c.target); a.returnFov = camera.fov;
          // Drain residual orbit damping so restoring the view cannot resume an old drag.
          c.enableDamping = false; c.update();
          camera.position.copy(a.returnPos); c.target.copy(a.returnTarget);
          a.focusTarget.set(...(s.panelFocus ?? keepsakePosition(s.panel,aspect)));
          a.dir.copy(camera.position).sub(a.focusTarget).normalize();
          const fov = THREE.MathUtils.degToRad(36);
          const h = 2*Math.atan(Math.tan(fov/2)*aspect);
          const distance = Math.max(1.0/Math.tan(fov/2), .95/Math.tan(h/2));
          a.focusPos.copy(a.dir).multiplyScalar(distance).add(a.focusTarget);
        }
      }
      if(s.panelStage === 'zooming-in' || s.panelStage === 'zooming-out') {
        const incoming = s.panelStage === 'zooming-in';
        const t = (now-a.tweenStart)/(reduce ? PANEL_TIMING.reduced : PANEL_TIMING.zoom);
        const k = smoothProgress(t);
        camera.position.lerpVectors(a.startPos,incoming ? a.focusPos : a.returnPos,k);
        c.target.lerpVectors(a.startTarget,incoming ? a.focusTarget : a.returnTarget,k);
        camera.fov = THREE.MathUtils.lerp(a.startFov,incoming ? 36 : a.returnFov,k);
        camera.updateProjectionMatrix(); camera.lookAt(c.target);
        if(t >= 1) {
          if(incoming) s.onPanelFocused();
          else {
            a.savedPos.copy(a.returnPos); a.savedTarget.copy(a.returnTarget); a.saved=true;
            a.orbit=true; s.onPanelRestored();
          }
        }
      }
      return;
    }
    a.panelStage = 'idle';
    if (c.enabled) {
      c.update();
      a.savedPos.copy(camera.position);
      a.savedTarget.copy(c.target);
      a.saved = true;
      return;
    }

    const pose = s.phase === 'approach' || s.phase === 'relight' ? poses.approach
      : s.phase === 'blowing' ? poses.blowing : s.phase === 'blown' ? poses.blown : poses.overview;
    const vRad = THREE.MathUtils.degToRad(pose.fov);
    const hRad = 2 * Math.atan(Math.tan(vRad / 2) * aspect);
    const distance = Math.max(pose.radius / Math.tan(vRad / 2), pose.width * THREE.MathUtils.clamp(aspect, 0.6, 1.5) / Math.tan(hRad / 2)) * 1.14;
    const e = sinceEntered();
    const intro = reduce ? 0 : e < 0 ? 1 : 1 - easeOutCubic(clamp01(e / 3.4));
    a.target.set(pose.target[0], pose.target[1] + intro * 0.5, pose.target[2]);
    if (s.phase !== 'party') a.target.y += 50 / Math.max(size.height, 1) * distance * Math.tan(vRad / 2);
    a.dir.set(THREE.MathUtils.lerp(pose.dir[0], -0.75, intro), THREE.MathUtils.lerp(pose.dir[1], 0.55, intro), pose.dir[2]).normalize();
    a.pos.copy(a.dir).multiplyScalar(distance * (1 + intro * 0.5)).add(a.target);
    if (s.phase === 'party' && a.saved) { a.pos.copy(a.savedPos); a.target.copy(a.savedTarget); }
    const k = reduce || !a.placed ? 1 : 1 - Math.exp(-dt * 4.2);
    camera.position.lerp(a.pos, k);
    c.target.lerp(a.target, k);
    camera.fov = THREE.MathUtils.lerp(camera.fov, pose.fov, k);
    camera.updateProjectionMatrix();
    camera.lookAt(c.target);
    a.placed = true;
    if (s.phase === 'party' && now >= a.holdUntil) {
      a.orbit = true;
      c.update();
    }
  }, -1);
  return null;
}
