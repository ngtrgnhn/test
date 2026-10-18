import { useEffect } from "react";
import * as THREE from "three";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { PartyConfig } from "../config";
import { useParty } from "../store";
import { setCursor, DEBUG } from "../dom";
import { CameraRig } from "./CameraRig";
import { Cake } from "./Cake";
import { Character } from "./Character";
import { Room, Rug } from "./Room";
import { Table, Gifts, TableSettings } from "./Table";
import { Balloons, Numerals } from "./Balloons";
import { Garland } from "./Garland";
import { AmbientConfetti, ConfettiCannons, Glitter, FloatingHearts, WishFx } from "./Particles";
import { EnvProvider } from "./Env";
import { RigLights } from "./Lights";
import { Shadowed } from "./anim";
import { cakeIsClickable } from "./interaction";
import { FloatingKeepsakes } from "./FloatingKeepsakes";
import { TABLE_H } from "./constants";

/**
 * The cake IS the button: pressing it walks up to the cake / blows / relights.
 * Events arrive through the shared DOM root (see <Canvas eventSource> in App),
 * because the scroll page covers the canvas.
 */
function CakeHitArea() {
  const hover = (on: boolean) => {
    const ok = on && cakeIsClickable();
    setCursor(ok ? "pointer" : "");
    useParty.getState().setCakeHover(ok);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!cakeIsClickable()) return;
    e.stopPropagation();
    const s = useParty.getState();
    if (s.phase === "party") s.startApproach();
    else if (s.phase === "approach") s.requestBlow();
    else if (s.phase === "blown") s.requestRelight();
    hover(false);
  };

  return (
    <mesh
      position={[0, (TABLE_H + 3.15) / 2, 0]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(true);
      }}
      onPointerMove={() => hover(true)}
      onPointerOut={() => hover(false)}
    >
      <cylinderGeometry args={[1.12, 1.12, 3.15 - TABLE_H, 20]} />
      <meshBasicMaterial colorWrite={false} depthWrite={false} />
    </mesh>
  );
}

/** ?debug only: `window.__cakeXY()` → where the cake is on screen (CSS px), so tests can click it wherever the camera is.
 *  Pass a world point `[x, y, z]` to project any other spot (e.g. to measure camera parallax). */
function DebugProbe() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!DEBUG) return;
    const w = window as unknown as {
      __cakeXY?: (p?: [number, number, number]) => { x: number; y: number };
    };
    w.__cakeXY = (p = [0, 1.7, 0]) => {
      const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
      return { x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height };
    };
    return () => {
      delete w.__cakeXY;
    };
  }, [camera, size]);
  return null;
}

export function Experience({ config }: { config: PartyConfig }) {
  return (
    <EnvProvider>
      <DebugProbe />
      <color attach="background" args={["#ffc9de"]} />
      <fog attach="fog" args={["#ffc9de", 17, 44]} />

      <RigLights />
      <CameraRig />

      <Room />
      <Rug />

      <Shadowed>
        <Table />
        <TableSettings />
        <Cake candleCount={config.cake.candles} age={config.recipient.age} topper={config.cake.topper} />
        <Gifts />
        <Balloons />
        <Numerals age={config.recipient.age} />
      </Shadowed>
      <CakeHitArea />
      <Shadowed receive={false}>
        <Character bannerText={config.banner.text} bannerSub={config.banner.sub} />
      </Shadowed>

      <Garland text={config.scene.garland} />
      <FloatingKeepsakes config={config} />

      <FloatingHearts />
      <Glitter />
      <AmbientConfetti />
      <ConfettiCannons candleCount={config.cake.candles} />
      <WishFx candleCount={config.cake.candles} />
    </EnvProvider>
  );
}
