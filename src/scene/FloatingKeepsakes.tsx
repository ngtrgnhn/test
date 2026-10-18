import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeT, type PartyConfig } from '../config';
import { useParty, type Panel } from '../store';
import { setCursor } from '../dom';
import { useEnv } from './Env';
import { useProfile, useQuality } from './quality';
import { Pop } from './anim';
import { roomIsInteractive } from './interaction';
import { skyTexture, starTexture } from './textures';
import { Twinkle } from './Twinkle';
import { keepsakePosition } from './keepsakeLayout';
import { StaticBatch } from './StaticBatch';

const cardShape = new THREE.Shape();
cardShape.moveTo(-0.44, 0.27); cardShape.lineTo(0, -0.07); cardShape.lineTo(0.44, 0.27); cardShape.closePath();
const flap = new THREE.ShapeGeometry(cardShape);
const bodyGeometry = new RoundedBoxGeometry(0.96, 0.64, 0.075, 3, 0.025);
const giftGeometry = new RoundedBoxGeometry(0.62, 0.57, 0.6, 3, 0.035);
const lidGeometry = new RoundedBoxGeometry(0.69, 0.12, 0.67, 3, 0.02);

function labelTexture(title: string, sub: string) {
  const c=document.createElement('canvas'); c.width=1024; c.height=320;
  const x=c.getContext('2d')!; x.scale(2,2);
  const polygon=(points:number[][],color:string) => {
    x.fillStyle=color; x.beginPath(); points.forEach(([px,py],i) => i ? x.lineTo(px,py) : x.moveTo(px,py)); x.closePath(); x.fill();
  };
  polygon([[6,34],[94,34],[94,155],[6,155],[33,94]],'#48132e');
  polygon([[418,34],[506,34],[479,94],[506,155],[418,155]],'#48132e');
  polygon([[50,130],[94,130],[94,155]],'#331025');
  polygon([[418,130],[462,130],[418,155]],'#331025');
  x.fillStyle='#6a2149'; x.fillRect(50,10,412,122);
  x.strokeStyle='#f5ccde'; x.lineWidth=1.5; x.setLineDash([5,5]);
  x.beginPath(); x.moveTo(59,20); x.lineTo(453,20); x.moveTo(59,122); x.lineTo(453,122); x.stroke(); x.setLineDash([]);
  x.textAlign='center'; x.textBaseline='middle';
  x.font="800 44px 'Baloo 2',sans-serif"; x.fillStyle='#fffaf2'; x.fillText(title,256,53,390);
  x.font="500 22px 'Be Vietnam Pro',sans-serif"; x.fillStyle='#ffe1bc'; x.fillText(sub,256,101,390);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8;
  return t;
}
function EnvelopeModel() {
  const env = useEnv();
  return <group rotation={[0, 0, -0.1]}>
    <mesh geometry={bodyGeometry}><meshStandardMaterial color="#fff2e9" roughness={0.7} envMap={env} envMapIntensity={0.25} /></mesh>
    <mesh geometry={flap} position={[0, 0, 0.045]}><meshStandardMaterial color="#ff92bd" roughness={0.6} side={THREE.DoubleSide} /></mesh>
    <mesh position={[0, -0.055, 0.075]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.105, 0.105, 0.025, 32]} /><meshStandardMaterial color="#cc396e" roughness={0.25} metalness={0.18} envMap={env} /></mesh>
    <mesh position={[0, -0.05, 0.095]}><sphereGeometry args={[0.038, 12, 8]} /><meshStandardMaterial color="#ffd6df" roughness={0.4} /></mesh>
    <mesh position={[0.32, 0.18, 0.045]}><planeGeometry args={[0.14, 0.17]} /><meshStandardMaterial color="#ffd98a" roughness={0.8} /></mesh>
  </group>;
}
function MemoryModel() {
  const sky = useMemo(() => skyTexture(), []);
  return <group>
    {[-1, 0, 1].map((i) => <group key={i} position={[i * 0.12, Math.abs(i) * -0.025, i * 0.045]} rotation={[0, 0, i * -0.15]}>
      <mesh geometry={bodyGeometry} scale={[0.7, 1.25, 0.65]}><meshStandardMaterial color="#fffaf1" roughness={0.75} /></mesh>
      <mesh position={[0, 0.055, 0.031]}><planeGeometry args={[0.55, 0.55]} /><meshBasicMaterial map={sky} /></mesh>
      <mesh position={[0, -0.31, 0.031]}><planeGeometry args={[0.3, 0.015]} /><meshBasicMaterial color="#dca3b3" /></mesh>
    </group>)}
  </group>;
}
function GiftModel() {
  const env = useEnv();
  return <group rotation={[0.12, -0.3, 0.05]}>
    <mesh geometry={giftGeometry}><meshStandardMaterial color="#ffe0a3" roughness={0.4} envMap={env} envMapIntensity={0.55} /></mesh>
    <mesh geometry={lidGeometry} position={[0, 0.29, 0]}><meshStandardMaterial color="#ffecc8" roughness={0.4} /></mesh>
    <mesh><boxGeometry args={[0.12, 0.6, 0.615]} /><meshStandardMaterial color="#e75c97" roughness={0.3} /></mesh>
    <mesh><boxGeometry args={[0.635, 0.6, 0.11]} /><meshStandardMaterial color="#e75c97" roughness={0.3} /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[s * 0.13, 0.43, 0]} rotation={[Math.PI / 2, s * 0.35, s * 0.25]}><torusGeometry args={[0.13, 0.035, 8, 24]} /><meshStandardMaterial color="#e75c97" roughness={0.3} envMap={env} /></mesh>)}
    <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.07, 16, 10]} /><meshStandardMaterial color="#c93f7d" roughness={0.25} /></mesh>
  </group>;
}

function Keepsake({ id, title, sub, position, delay, small }: { id: Panel; title: string; sub: string; position: [number,number,number]; delay: number; small: boolean }) {
  const group = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const [hovered, setHovered] = useState(false);
  const phase = useParty(s => s.phase);
  const panel = useParty(s => s.panel);
  const camera = useThree(s => s.camera);
  const reduce = useQuality(s => s.reduceMotion);
  const tex = useMemo(() => labelTexture(title, sub), [title, sub]);
  useEffect(() => () => tex.dispose(), [tex]);
  useEffect(() => { if (phase !== 'party' || panel) { setHovered(false); setCursor(''); } }, [phase, panel]);
  const over = (e: ThreeEvent<PointerEvent>) => {
    if (!roomIsInteractive()) return;
    e.stopPropagation(); setHovered(true); setCursor('pointer');
  };
  useFrame(({ clock }, dt) => {
    const g = group.current; if (!g) return;
    const t = clock.elapsedTime;
    g.position.y = position[1] + (reduce ? 0 : Math.sin(t * 1.3 + delay * 7) * 0.09);
    g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
    if (model.current) {
      const base = small ? 0.73 : 1;
      const s = THREE.MathUtils.damp(model.current.scale.x, base * (hovered ? 1.13 : 1), 10, Math.min(dt, .05));
      model.current.scale.setScalar(s);
      model.current.rotation.z = reduce ? 0 : Math.sin(t * 0.8 + delay) * 0.045;
    }
  });
  const active = phase === 'party';
  return <Pop delay={delay} dur={0.9} ease="elastic" origin={position} rise={-0.6}>
    <group ref={group} position={position} visible={active}
      onClick={e => { if (roomIsInteractive()) { e.stopPropagation(); setCursor(''); if(group.current) group.current.getWorldPosition(world);
        useParty.getState().openPanel(id,[world.x,world.y,world.z]); } }}
      onPointerOver={over} onPointerOut={() => { setHovered(false); setCursor(''); }}>
      <group ref={model} scale={small ? .73 : 1}>
        {id === 'letter' ? <EnvelopeModel /> : id === 'memories' ? <StaticBatch><MemoryModel /></StaticBatch> : <StaticBatch><GiftModel /></StaticBatch>}
        <sprite position={[0, -0.7, 0]} scale={[1.65, 0.515, 1]}><spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} /></sprite>
      </group>
    </group>
  </Pop>;
}
export function FloatingKeepsakes({ config }: { config: PartyConfig }) {
  const size = useThree(s => s.size);
  const small = size.width / Math.max(size.height, 1) < 0.85;
  const phase = useParty(s => s.phase);
  const profile = useProfile();
  const star = useMemo(() => starTexture(), []);
  const T = useMemo(() => makeT(config), [config]);
  return <group>
    <Keepsake id="letter" title={T('roomLetter')} sub={T('roomLetterSub')} position={keepsakePosition('letter',size.width/Math.max(size.height,1))} delay={1.5} small={small} />
    {config.memories.length > 0 && <Keepsake id="memories" title={T('roomMemories')} sub={T('roomMemoriesSub', { n: config.memories.length })} position={keepsakePosition('memories',size.width/Math.max(size.height,1))} delay={1.7} small={small} />}
    {config.gifts.length > 0 && <Keepsake id="gifts" title={T('roomGifts')} sub={T('roomGiftsSub')} position={keepsakePosition('gifts',size.width/Math.max(size.height,1))} delay={1.9} small={small} />}
    {phase === 'party' && <Twinkle count={profile.fancy ? 28 : 12} box={[0, 2.5, 0, 3, .9, 2.5]} texture={star} colors={['#fff0c8','#ffbee0']} intensity={1.8} size={[.035,.08]} drift={.12} />}
  </group>;
}
