import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useParty, Phase } from "../store";
import { CHAR_OFFSCREEN, CHAR_SPEED, FLAME_Y, CANDY, stands } from "./constants";
import { toonGradient, bannerTexture, puffTexture, blobShadowTexture } from "./textures";
import { breath } from "./interaction";
import { useProfile } from "./quality";
import { easeOutBack, clamp01 } from "./anim";

type Mode = "hidden" | "walk" | "pray" | "blow" | "banner" | "light";
type WalkTarget = "stand" | "light" | "banner" | "exit";

const CAKE = new THREE.Vector3(0, 0, 0);

interface Sim {
  mode: Mode;
  walkTo: THREE.Vector3;
  walkTarget: WalkTarget | null;
  clock: number;
  faceY: number;
  arrived: boolean;
  flamesFired: boolean;
  bannerFired: boolean;
  relitFired: boolean;
  puffAcc: number;
}

export function Character({ bannerText, bannerSub }: { bannerText: string; bannerSub: string }) {
  const phase = useParty((s) => s.phase);
  const profile = useProfile();
  const dressGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(.16,.37,.6,profile.fancy ? 64 : 28,12);
    const p = g.getAttribute('position');
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), z=p.getZ(i), v=(.3-p.getY(i))/.6;
      const r=Math.hypot(x,z), k=1+Math.sin(Math.atan2(z,x)*18)*.045*v;
      if(r>0) p.setXYZ(i,x*k,p.getY(i),z*k);
    }
    g.computeVertexNormals(); return g;
  },[profile.fancy]);
  useEffect(() => () => dressGeo.dispose(),[dressGeo]);
  const api = useParty;

  const grad = useMemo(() => toonGradient(), []);
  const tex = useMemo(() => bannerTexture(bannerText, bannerSub), [bannerText, bannerSub]);
  useEffect(() => () => tex.dispose(), [tex]);
  const bannerGeo = useMemo(() => new THREE.PlaneGeometry(2.2, 0.86, 30, 6), []);
  useEffect(() => () => bannerGeo.dispose(), [bannerGeo]);
  const bannerBase = useMemo(() => Float32Array.from(bannerGeo.getAttribute("position").array as ArrayLike<number>), [bannerGeo]);
  const puffTex = useMemo(() => puffTexture(), []);
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const tmpM = useMemo(() => new THREE.Matrix4(), []);
  const shadowTex = useMemo(() => blobShadowTexture(), []);

  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const tailL = useRef<THREE.Group>(null);
  const tailR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const brows = useRef<THREE.Group>(null);
  const mouthOpen = useRef<THREE.Mesh>(null);
  const smile = useRef<THREE.Mesh>(null);
  const banner = useRef<THREE.Group>(null);
  const match = useRef<THREE.Group>(null);
  const matchLight = useRef<THREE.PointLight>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const puffs = useRef<THREE.Group>(null);

  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const sim = useRef<Sim>({
    mode: "hidden",
    walkTo: CHAR_OFFSCREEN.clone(),
    walkTarget: null,
    clock: 0,
    faceY: 0,
    arrived: false,
    flamesFired: false,
    bannerFired: false,
    relitFired: false,
    puffAcc: 0,
  }).current;

  const blink = useRef({ next: 2, t: -1 });
  const puffData = useRef(
    Array.from({ length: 14 }, () => ({
      life: -1, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    }))
  );

  /* ------------ phase -> behaviour ------------ */
  useEffect(() => {
    sim.clock = 0;
    const r = root.current;
    if (!r) return;
    const S = stands(size.width / Math.max(size.height, 1));
    switch (phase) {
      case "approach":
        r.visible = true;
        r.position.copy(S.offscreen);
        sim.mode = "walk";
        sim.walkTo.copy(S.stand);
        sim.walkTarget = "stand";
        sim.arrived = false;
        sim.faceY = Math.atan2(S.stand.x + 1, -S.stand.z);
        break;
      case "blowing":
        sim.mode = "blow";
        sim.flamesFired = false;
        break;
      case "blown":
        sim.mode = "walk";
        sim.walkTo.copy(S.banner);
        sim.walkTarget = "banner";
        sim.bannerFired = false;
        break;
      case "relight":
        sim.mode = "walk";
        sim.walkTo.copy(S.light);
        sim.walkTarget = "light";
        sim.arrived = false;
        sim.relitFired = false;
        if (banner.current) {
          banner.current.visible = false;
          banner.current.scale.setScalar(0.001);
        }
        break;
      default:
        sim.mode = "hidden";
        sim.walkTarget = null;
        r.visible = false;
        r.position.copy(CHAR_OFFSCREEN);
        if (banner.current) {
          banner.current.visible = false;
          banner.current.scale.setScalar(0.001);
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ------------ frame loop ------------ */
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const r = root.current;
    if (!r || sim.mode === "hidden") {
      if (shadow.current) shadow.current.visible = false;
      return;
    }
    sim.clock += dt;

    /* ----- walking ----- */
    if (sim.mode === "walk") {
      const dx = sim.walkTo.x - r.position.x;
      const dz = sim.walkTo.z - r.position.z;
      const dist = Math.hypot(dx, dz);
      const step = CHAR_SPEED * dt;
      if (dist <= Math.max(step, 0.03)) {
        r.position.x = sim.walkTo.x;
        r.position.z = sim.walkTo.z;
        onArrive();
      } else {
        r.position.x += (dx / dist) * step;
        r.position.z += (dz / dist) * step;
        const targetY = Math.atan2(dx, dz);
        r.rotation.y = dampAngle(r.rotation.y, targetY, 10, dt);
        r.position.y = Math.abs(Math.sin(sim.clock * 10.5)) * 0.05;
      }
    }

    function onArrive() {
      if (sim.arrived && sim.walkTarget !== "banner") return;
      sim.arrived = true;
      const wt = sim.walkTarget;
      sim.walkTarget = null;
      r!.position.y = 0;
      if (wt === "stand") {
        sim.mode = "pray";
        sim.faceY = Math.atan2(CAKE.x - r!.position.x, CAKE.z - r!.position.z);
        api.getState().onCharacterArrived();
      } else if (wt === "light") {
        sim.mode = "light";
        sim.clock = 0;
        sim.faceY = Math.atan2(CAKE.x - r!.position.x, CAKE.z - r!.position.z);
      } else if (wt === "banner") {
        sim.mode = "banner";
        sim.clock = 0;
        sim.faceY = Math.atan2(
          camera.position.x - r!.position.x,
          camera.position.z - r!.position.z
        );
      } else if (wt === "exit") {
        sim.mode = "hidden";
        r!.visible = false;
        if (banner.current) banner.current.visible = false;
        api.getState().finishRelight();
      }
    }

    /* ----- the breath the candle flames lean away from ----- */
    breath.active = sim.mode === "blow" && sim.clock > 0.6;
    if (sim.mode === "blow") {
      const bx = CAKE.x - r.position.x;
      const bz = CAKE.z - r.position.z;
      const bl = Math.hypot(bx, bz) || 1;
      breath.dx = bx / bl;
      breath.dz = bz / bl;
    }

    /* ----- timed transitions ----- */
    if (sim.mode === "blow") {
      // 0 -> 0.55s inhale, then the real blow
      if (!sim.flamesFired && sim.clock > 0.95) {
        sim.flamesFired = true;
        api.getState().onFlamesOut();
      }
      if (sim.clock > 2.15) {
        api.getState().onBannerShown();
      }
    }
    if (sim.mode === "light") {
      if (!sim.relitFired && sim.clock > 0.6) {
        sim.relitFired = true;
        api.getState().onCandlesRelit();
      }
      if (sim.clock > 1.9) {
        sim.mode = "walk";
        sim.walkTo.copy(stands(size.width / Math.max(size.height, 1)).offscreen);
        sim.walkTarget = "exit";
        sim.arrived = false;
      }
    }

    /* ----- pose targets ----- */
    let armLx = 0.08, armLy = 0, armLz = 0.1;
    let armRx = 0.08, armRy = 0, armRz = -0.1;
    let bodyX = 0, headX = 0, legLx = 0, legRx = 0;
    let openMouth = 0.001;
    let bob = 0;

    if (sim.mode === "walk") {
      const s = Math.sin(sim.clock * 10.5);
      armLx = s * 0.5; armRx = -s * 0.5; armLz = 0.08; armRz = -0.08;
      legLx = -s * 0.7; legRx = s * 0.7;
    } else if (sim.mode === "pray") {
      armLx = -1.22; armRx = -1.22;
      armLz = -0.52; armRz = 0.52;
      armLy = 0.15; armRy = -0.15;
      headX = 0.24;
      bob = Math.sin(t * 2.2) * 0.012;
    } else if (sim.mode === "blow") {
      if (sim.clock < 0.55) {
        // inhale: lean back, chin up, arms relax outward
        bodyX = -0.1;
        headX = -0.22;
        armLx = 0.3; armRx = 0.3;
        armLz = 0.28; armRz = -0.28;
        openMouth = 0.12;
      } else {
        // blow: lean into the candles
        bodyX = 0.42 + Math.sin(t * 30) * 0.012;
        headX = 0.24;
        armLx = -1.35; armLz = -0.42;
        armRx = -1.55; armRz = 0.3;
        openMouth = 1;
      }
    } else if (sim.mode === "banner") {
      armLx = -2.5; armRx = -2.5;
      armLz = -0.4; armRz = 0.4;
      headX = -0.1;
      bob = Math.abs(Math.sin(t * 5)) * 0.045;
      openMouth = 0.25;
    } else if (sim.mode === "light") {
      armRx = -2.35; armRz = 0.22;
      armLx = -0.35;
      bodyX = 0.08;
      bob = 0.05;
    }

    /* ----- apply with damping ----- */
    const D = 9;
    if (sim.mode !== "walk") {
      r.rotation.y = dampAngle(r.rotation.y, sim.faceY, 7, dt);
      r.position.y = THREE.MathUtils.damp(r.position.y, bob, 8, dt);
    }
    if (body.current) body.current.rotation.x = THREE.MathUtils.damp(body.current.rotation.x, bodyX, D, dt);
    if (head.current) head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, headX, D, dt);
    if (armL.current) {
      armL.current.rotation.x = THREE.MathUtils.damp(armL.current.rotation.x, armLx, D, dt);
      armL.current.rotation.z = THREE.MathUtils.damp(armL.current.rotation.z, armLz, D, dt);
      armL.current.rotation.y = THREE.MathUtils.damp(armL.current.rotation.y, armLy, D, dt);
    }
    if (armR.current) {
      armR.current.rotation.x = THREE.MathUtils.damp(armR.current.rotation.x, armRx, D, dt);
      armR.current.rotation.z = THREE.MathUtils.damp(armR.current.rotation.z, armRz, D, dt);
      armR.current.rotation.y = THREE.MathUtils.damp(armR.current.rotation.y, armRy, D, dt);
    }
    if (legL.current) legL.current.rotation.x = THREE.MathUtils.damp(legL.current.rotation.x, legLx, 12, dt);
    if (legR.current) legR.current.rotation.x = THREE.MathUtils.damp(legR.current.rotation.x, legRx, 12, dt);
    if (tailL.current) tailL.current.rotation.z = 0.12 + Math.sin(t * 3.1) * 0.07;
    if (tailR.current) tailR.current.rotation.z = -0.12 + Math.sin(t * 3.1 + 1) * 0.07;

    /* blink */
    const b = blink.current;
    if (b.t >= 0) {
      b.t += dt;
      const k = b.t < 0.07 ? 0.1 : 1;
      if (eyes.current) eyes.current.scale.y = k;
      if (b.t > 0.14) { b.t = -1; b.next = t + 2.2 + Math.random() * 2.6; }
    } else if (t > b.next) {
      b.t = 0;
    }

    /* brows: up while inhaling / cheering, relaxed otherwise */
    if (brows.current) {
      const up = sim.mode === "banner" ? 0.02 : sim.mode === "blow" && sim.clock < 0.55 ? 0.028 : sim.mode === "pray" ? -0.006 : 0;
      brows.current.position.y = THREE.MathUtils.damp(brows.current.position.y, up, 12, dt);
    }

    /* mouth open (blow) */
    if (mouthOpen.current) {
      const s = THREE.MathUtils.damp(mouthOpen.current.scale.y, openMouth, 14, dt);
      mouthOpen.current.scale.set(1, Math.max(s, 0.001), 1);
      mouthOpen.current.visible = openMouth > 0.05;
    }
    if (smile.current) smile.current.visible = openMouth <= 0.2;

    /* match prop + light */
    const matchOn = sim.mode === "light";
    if (match.current) match.current.visible = matchOn;
    if (matchLight.current)
      matchLight.current.intensity = THREE.MathUtils.damp(
        matchLight.current.intensity, matchOn ? 2.2 : 0, 10, dt
      );

    /* banner follows her, always faces camera: it unfurls, then its cloth ripples */
    if (banner.current) {
      const show = sim.mode === "banner";
      banner.current.visible = show || banner.current.visible;
      if (show) {
        // hover above her head — but never wider than the screen, and never off its sides
        // (a phone in portrait only sees ~2 world units across)
        const cam = camera as THREE.PerspectiveCamera;
        const aspect = size.width / Math.max(size.height, 1);
        cam.updateMatrixWorld();
        tmpM.copy(cam.matrixWorld).invert();
        const bv = tmpV.set(r.position.x, 2.12 + Math.sin(t * 2.4) * 0.03, r.position.z + 0.12).applyMatrix4(tmpM);
        const halfVis = Math.max(0.3, -bv.z) * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * aspect;
        const sc = Math.min(1, (0.86 * halfVis) / 1.1);
        const lim = Math.max(0, 1 - 0.05 - (1.1 * sc) / halfVis);
        bv.x = THREE.MathUtils.clamp(bv.x / halfVis, -lim, lim) * halfVis;
        bv.applyMatrix4(cam.matrixWorld);
        const u = (banner.current.userData.u ?? 0) as number;
        const nu = Math.min(1, u + dt / 0.9);
        banner.current.userData.u = nu;
        const e = easeOutBack(clamp01(nu), 1.3);
        banner.current.scale.set(Math.max(sc * e, 0.001), Math.max(sc * (0.55 + 0.45 * e), 0.001), sc);
        banner.current.position.copy(bv);
        const az = Math.atan2(camera.position.x - bv.x, camera.position.z - bv.z);
        banner.current.rotation.y = az;
        banner.current.rotation.z = Math.sin(t * 1.8) * 0.02;
        // ripple the cloth
        const pa = bannerGeo.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < pa.count; i++) {
          const x = bannerBase[i * 3];
          const y = bannerBase[i * 3 + 1];
          pa.setZ(i, Math.sin(x * 2.4 + t * 3.2) * 0.035 + Math.sin(x * 5.1 - t * 2.1 + y * 2) * 0.012);
          pa.setY(i, y + Math.sin(x * 2.4 + t * 3.2 + 1) * 0.012);
        }
        pa.needsUpdate = true;
      } else {
        banner.current.userData.u = 0;
      }
    }

    /* ----- blow puffs ----- */
    if (puffs.current) {
      const group = puffs.current;
      group.visible = sim.mode === "blow" || puffData.current.some((p) => p.life >= 0);
      if (sim.mode === "blow" && sim.clock > 0.6) {
        sim.puffAcc += dt;
        if (sim.puffAcc > 0.06) {
          sim.puffAcc = 0;
          const free = puffData.current.find((p) => p.life < 0);
          if (free) {
            free.life = 0;
            const fy = r.rotation.y;
            free.pos.set(
              r.position.x + Math.sin(fy) * 0.26,
              1.42,
              r.position.z + Math.cos(fy) * 0.26
            );
            free.vel
              .set(0 - free.pos.x, FLAME_Y - free.pos.y + 0.25, 0 - free.pos.z)
              .normalize()
              .multiplyScalar(2.4);
          }
        }
      }
      puffData.current.forEach((p, i) => {
        const mesh = group.children[i] as THREE.Mesh;
        if (!mesh) return;
        if (p.life >= 0) {
          p.life += dt;
          const k = p.life / 0.55;
          if (k >= 1) {
            p.life = -1;
            mesh.visible = false;
            return;
          }
          p.pos.addScaledVector(p.vel, dt);
          p.pos.y += Math.sin(k * Math.PI) * dt * 0.9;
          mesh.visible = true;
          mesh.position.copy(p.pos);
          const s = 0.5 + k * 1.5;
          mesh.scale.setScalar(s);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
        }
      });
    }

    /* shadow blob */
    if (shadow.current) {
      shadow.current.visible = true;
      shadow.current.position.set(r.position.x, 0.012, r.position.z);
      const sq = sim.mode === "walk" ? 1 + Math.sin(sim.clock * 21) * 0.06 : 1;
      shadow.current.scale.set(0.52 * sq, 0.52, 1);
    }
  });

  /* ---------------- mesh ---------------- */
  const skin = CANDY.skin;
  return (
    <>
      <group ref={root} position={CHAR_OFFSCREEN} visible={false}>
        {/* legs */}
        <group ref={legL} position={[0.09, 0.36, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.34, 10]} />
            <meshToonMaterial color="#ffffff" gradientMap={grad} />
          </mesh>
          <mesh position={[0, -0.345, 0.035]} scale={[1, 0.62, 1.3]}>
            <sphereGeometry args={[0.085, 12, 10]} />
            <meshToonMaterial color={CANDY.shoe} gradientMap={grad} />
          </mesh>
        </group>
        <group ref={legR} position={[-0.09, 0.36, 0]}>
          <mesh position={[0, -0.17, 0]}>
            <cylinderGeometry args={[0.055, 0.06, 0.34, 10]} />
            <meshToonMaterial color="#ffffff" gradientMap={grad} />
          </mesh>
          <mesh position={[0, -0.345, 0.035]} scale={[1, 0.62, 1.3]}>
            <sphereGeometry args={[0.085, 12, 10]} />
            <meshToonMaterial color={CANDY.shoe} gradientMap={grad} />
          </mesh>
        </group>

        {/* body */}
        <group ref={body} position={[0, 0.36, 0]}>
          <mesh position={[0, 0.3, 0]} geometry={dressGeo}>
            <meshToonMaterial color={CANDY.dress} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <torusGeometry args={[0.355, 0.03, 8, 24]} />
            <meshToonMaterial color="#ffffff" gradientMap={grad} />
          </mesh>
          <mesh position={[0, -0.03, 0]}>
            <cylinderGeometry args={[0.37, 0.4, 0.08, 24]} />
            <meshToonMaterial color="#fff4f8" gradientMap={grad} />
          </mesh>
          {/* ribbon belt + bow */}
          <mesh position={[0, 0.56, 0]}>
            <cylinderGeometry args={[0.198, 0.205, 0.05, 20]} />
            <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.56, -0.2]} rotation={[0, 0, 0.5]} scale={[1.3, 0.8, 0.6]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
          </mesh>
          <mesh position={[0.06, 0.56, -0.2]} rotation={[0, 0, -0.5]} scale={[1.3, 0.8, 0.6]}>
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.68, 0]}>
            <cylinderGeometry args={[0.145, 0.16, 0.2, 16]} />
            <meshToonMaterial color={CANDY.dress} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.13, 0.022, 8, 20]} />
            <meshToonMaterial color="#ffffff" gradientMap={grad} />
          </mesh>
          {/* buttons */}
          <mesh position={[0, 0.7, 0.155]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshToonMaterial color={CANDY.butter} gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.62, 0.162]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshToonMaterial color={CANDY.butter} gradientMap={grad} />
          </mesh>

          {/* arms */}
          <group ref={armL} position={[0.215, 0.74, 0]}>
            <mesh>
              <sphereGeometry args={[0.075, 12, 10]} />
              <meshToonMaterial color={CANDY.dressDeep} gradientMap={grad} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.4, 10]} />
              <meshToonMaterial color={skin} gradientMap={grad} />
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshToonMaterial color={skin} gradientMap={grad} />
            </mesh>
          </group>
          <group ref={armR} position={[-0.215, 0.74, 0]}>
            <mesh>
              <sphereGeometry args={[0.075, 12, 10]} />
              <meshToonMaterial color={CANDY.dressDeep} gradientMap={grad} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.4, 10]} />
              <meshToonMaterial color={skin} gradientMap={grad} />
            </mesh>
            <mesh position={[0, -0.42, 0]}>
              <sphereGeometry args={[0.06, 10, 10]} />
              <meshToonMaterial color={skin} gradientMap={grad} />
            </mesh>
            {/* match / lighter stick used to relight candles */}
            <group ref={match} position={[0, -0.5, 0]} visible={false}>
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.014, 0.014, 0.2, 8]} />
                <meshToonMaterial color={CANDY.choco} gradientMap={grad} />
              </mesh>
              <mesh position={[0, 0.215, 0]}>
                <sphereGeometry args={[0.035, 10, 10]} />
                <meshBasicMaterial color="#ffb347" />
              </mesh>
              <pointLight ref={matchLight} position={[0, 0.24, 0]} color="#ffb066" intensity={0} distance={3.6} decay={1.6} />
            </group>
          </group>

          {/* head */}
          <group ref={head} position={[0, 0.95, 0]}>
            <mesh>
              <sphereGeometry args={[0.295, 24, 20]} />
              <meshToonMaterial color={skin} gradientMap={grad} />
            </mesh>
            {/* hair cap + back */}
            <mesh position={[0, 0.05, -0.03]} scale={[1.06, 1.02, 1.02]}>
              <sphereGeometry args={[0.3, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
            </mesh>
            <mesh position={[0, 0.02, -0.09]} scale={[1.02, 0.98, 0.92]}>
              <sphereGeometry args={[0.29, 20, 16]} />
              <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
            </mesh>
            {/* bangs */}
            <mesh position={[-0.13, 0.17, 0.235]}>
              <sphereGeometry args={[0.088, 12, 10]} />
              <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
            </mesh>
            <mesh position={[0, 0.205, 0.245]}>
              <sphereGeometry args={[0.095, 12, 10]} />
              <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
            </mesh>
            <mesh position={[0.13, 0.17, 0.235]}>
              <sphereGeometry args={[0.088, 12, 10]} />
              <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
            </mesh>
            {/* twin tails */}
            <group ref={tailL} position={[0.3, 0.1, -0.04]}>
              <mesh position={[0.05, 0.02, 0]}>
                <torusGeometry args={[0.05, 0.022, 8, 14]} />
                <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
              </mesh>
              <mesh position={[0.07, -0.13, 0]} scale={[0.9, 1.25, 0.9]}>
                <sphereGeometry args={[0.125, 14, 12]} />
                <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
              </mesh>
            </group>
            <group ref={tailR} position={[-0.3, 0.1, -0.04]}>
              <mesh position={[-0.05, 0.02, 0]}>
                <torusGeometry args={[0.05, 0.022, 8, 14]} />
                <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
              </mesh>
              <mesh position={[-0.07, -0.13, 0]} scale={[0.9, 1.25, 0.9]}>
                <sphereGeometry args={[0.125, 14, 12]} />
                <meshToonMaterial color={CANDY.hair} gradientMap={grad} />
              </mesh>
            </group>
            {/* face */}
            <group ref={eyes}>
              {[1, -1].map((sx) => (
                <group key={sx} position={[sx * 0.105, -0.008, 0.248]}>
                  <mesh scale={[1, 1.18, 0.72]}>
                    <sphereGeometry args={[0.046, 14, 12]} />
                    <meshToonMaterial color={CANDY.ink} gradientMap={grad} />
                  </mesh>
                  {/* warm iris glow */}
                  <mesh position={[0, -0.012, 0.022]} scale={[1, 0.7, 0.4]}>
                    <sphereGeometry args={[0.03, 10, 8]} />
                    <meshBasicMaterial color="#8a3b63" transparent opacity={0.85} />
                  </mesh>
                  {/* two sparkles */}
                  <mesh position={[sx * 0.014, 0.02, 0.034]}>
                    <sphereGeometry args={[0.0155, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <mesh position={[-sx * 0.016, -0.022, 0.034]}>
                    <sphereGeometry args={[0.0075, 8, 8]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  {/* lash flick */}
                  <mesh position={[sx * 0.046, 0.03, 0.01]} rotation={[0, 0, -sx * 0.9]}>
                    <capsuleGeometry args={[0.005, 0.028, 2, 4]} />
                    <meshBasicMaterial color={CANDY.ink} />
                  </mesh>
                </group>
              ))}
            </group>
            {/* brows lift when she inhales / cheers */}
            <group ref={brows}>
              {[1, -1].map((sx) => (
                <mesh key={sx} position={[sx * 0.108, 0.08, 0.262]} rotation={[0, 0, Math.PI / 2 - sx * 0.14]}>
                  <capsuleGeometry args={[0.0075, 0.05, 3, 6]} />
                  <meshToonMaterial color="#5b3321" gradientMap={grad} />
                </mesh>
              ))}
            </group>
            {/* hair bow */}
            <group position={[-0.2, 0.2, 0.1]} rotation={[0.1, 0.3, -0.35]}>
              {[1, -1].map((sx) => (
                <mesh key={sx} position={[sx * 0.05, 0, 0]} rotation={[0, 0, sx * 0.45]} scale={[1.25, 0.8, 0.55]}>
                  <sphereGeometry args={[0.05, 12, 10]} />
                  <meshToonMaterial color={CANDY.punch} gradientMap={grad} />
                </mesh>
              ))}
              <mesh>
                <sphereGeometry args={[0.026, 10, 8]} />
                <meshToonMaterial color={CANDY.punchDeep} gradientMap={grad} />
              </mesh>
            </group>
            <mesh position={[0.165, -0.075, 0.205]} scale={[1, 0.6, 0.42]}>
              <sphereGeometry args={[0.052, 10, 10]} />
              <meshBasicMaterial color="#ff9db8" transparent opacity={0.8} />
            </mesh>
            <mesh position={[-0.165, -0.075, 0.205]} scale={[1, 0.6, 0.42]}>
              <sphereGeometry args={[0.052, 10, 10]} />
              <meshBasicMaterial color="#ff9db8" transparent opacity={0.8} />
            </mesh>
            <mesh ref={smile} position={[0, -0.125, 0.262]} rotation={[0.15, 0, Math.PI]}>
              <torusGeometry args={[0.035, 0.011, 8, 14, Math.PI]} />
              <meshToonMaterial color={CANDY.ink} gradientMap={grad} />
            </mesh>
            <mesh ref={mouthOpen} position={[0, -0.135, 0.265]} scale={[1, 0.001, 0.7]} visible={false}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshToonMaterial color={CANDY.ink} gradientMap={grad} />
            </mesh>
          </group>
        </group>
      </group>

      {/* banner — world space, billboards to camera */}
      <group ref={banner} visible={false} scale={0.001}>
        <mesh geometry={bannerGeo}>
          <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-1.06, -0.02, -0.01]}>
          <cylinderGeometry args={[0.02, 0.02, 0.94, 8]} />
          <meshToonMaterial color={CANDY.choco} gradientMap={grad} />
        </mesh>
        <mesh position={[1.06, -0.02, -0.01]}>
          <cylinderGeometry args={[0.02, 0.02, 0.94, 8]} />
          <meshToonMaterial color={CANDY.choco} gradientMap={grad} />
        </mesh>
      </group>

      {/* blow puffs */}
      <group ref={puffs} visible={false}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i} visible={false}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* soft blob shadow */}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}
