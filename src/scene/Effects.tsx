import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useParty } from '../store';
import { DEBUG } from '../dom';
import { HIGH_PROFILE } from './quality';
import { GLOW_EXTRACT_FRAGMENT, PresentationBudget } from './renderBudget';

function canRenderHdr(gl:THREE.WebGLRenderer):boolean {
  return gl.capabilities.isWebGL2 && (gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float'));
}

/** Full-resolution scene and MSAA; only the soft glow uses smaller filter buffers. */
export function Effects() {
  const {gl,scene,camera,size,viewport,invalidate}=useThree();
  const composer=useRef<EffectComposer|null>(null);
  const bloom=useRef<UnrealBloomPass|null>(null);
  const budget=useRef(new PresentationBudget());
  const stats=useRef({fps:0,drawCalls:0,triangles:0,textures:0,dpr:1,detail:'high',frames:0,since:0,lastStage:''});
  useEffect(()=>{
    gl.toneMapping=THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure=1.02;
    gl.outputColorSpace=THREE.SRGBColorSpace;
    const previousReset=gl.info.autoReset;
    gl.info.autoReset=false;
    let c:EffectComposer|null=null;
    if(canRenderHdr(gl)) {
      try {
        const rt=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:Math.min(HIGH_PROFILE.msaa,gl.capabilities.maxSamples)});
        c=new EffectComposer(gl,rt);
        c.addPass(new RenderPass(scene,camera));
        const b=new UnrealBloomPass(new THREE.Vector2(1,1),HIGH_PROFILE.bloomStrength,.22,1.75);
        b.materialHighPassFilter.fragmentShader=GLOW_EXTRACT_FRAGMENT;
        b.materialHighPassFilter.uniforms.smoothWidth.value=.6;
        b.materialHighPassFilter.needsUpdate=true;
        c.addPass(b);c.addPass(new OutputPass());
        bloom.current=b;composer.current=c;
      } catch(e) {
        c?.passes.forEach(p=>p.dispose?.());c?.dispose();
        c=null;composer.current=null;bloom.current=null;
        console.warn('[party] HDR postprocessing unavailable; using direct tone mapping.',e);
      }
    }
    if(DEBUG) (window as unknown as {__partyPerformance:typeof stats.current}).__partyPerformance=stats.current;
    invalidate();
    return ()=>{
      composer.current=null;bloom.current=null;
      c?.passes.forEach(p=>p.dispose?.());c?.dispose();
      gl.info.autoReset=previousReset;
    };
  },[gl,scene,camera,invalidate]);
  useEffect(()=>{
    composer.current?.setPixelRatio(viewport.dpr);
    composer.current?.setSize(size.width,size.height);
    bloom.current?.setSize(Math.max(1,Math.round(size.width*viewport.dpr*.5)),Math.max(1,Math.round(size.height*viewport.dpr*.5)));
    invalidate();
  },[size.width,size.height,viewport.dpr,invalidate]);
  useFrame(state=>{
    const s=useParty.getState(),a=stats.current,now=performance.now();
    const stage=`${s.phase}:${s.panelStage}`;
    if(!budget.current.take(now,state.frameloop==='demand'||stage!==a.lastStage))return;
    a.lastStage=stage;
    gl.info.reset();
    if(composer.current)composer.current.render();else gl.render(scene,camera);
    a.drawCalls=gl.info.render.calls;a.triangles=gl.info.render.triangles;
    a.textures=gl.info.memory.textures;a.dpr=state.viewport.dpr;
    if(now-a.since>2000){a.fps=a.frames*1000/(now-a.since);a.frames=0;a.since=now;}
    a.frames++;
  },1);
  return null;
}

/** Keep the full 2048px map; static lighting needs fewer shadow updates than scene renders. */
export function ShadowBudget() {
  const gl=useThree(s=>s.gl);
  const accumulator=useRef(0);
  useEffect(()=>{
    gl.shadowMap.autoUpdate=false;gl.shadowMap.needsUpdate=true;
    return ()=>{gl.shadowMap.autoUpdate=true;};
  },[gl]);
  useFrame((_,dt)=>{
    accumulator.current+=Math.min(dt,.1);
    const hz=useParty.getState().phase==='party'?12:24;
    if(accumulator.current>=1/hz){gl.shadowMap.needsUpdate=true;accumulator.current=0;}
  });
  return null;
}
