import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { useParty } from '../src/store';
import { createGestureGuard } from '../src/scene/gesture';
import { normalizeConfig, makeT } from '../src/config';
import { giftKey, readReceipt } from '../src/ui/giftReceipt';
import { batchStaticChildren } from '../src/scene/StaticBatch';

const initial = { ...useParty.getState() };
const api = () => useParty.getState();
const reset = () => useParty.setState({ ...initial });

test('complete candle ceremony, with no skipped stages or repeated bursts', () => {
  reset(); api().enterParty(); assert.equal(api().phase,'loading');
  useParty.setState({phase:'intro'}); api().enterParty(); assert.equal(api().phase,'party');
  api().startApproach(); api().requestBlow(); assert.equal(api().phase,'approach');
  api().onCharacterArrived(); api().requestBlow(); assert.equal(api().phase,'blowing');
  api().onBannerShown(); assert.equal(api().phase,'blowing');
  api().onFlamesOut(); api().onFlamesOut(); assert.equal(api().burst,2); assert.equal(api().douse,1);
  api().onBannerShown(); assert.equal(api().phase,'blown');
  api().requestRelight(); api().finishRelight(); assert.equal(api().phase,'relight');
  api().onCandlesRelit(); api().finishRelight(); assert.equal(api().phase,'party'); assert.equal(api().candlesLit,true);
});
test('content panels block the cake and cannot interrupt a ceremony', () => {
  reset(); useParty.setState({phase:'party'}); api().openPanel('letter'); api().startApproach();
  assert.equal(api().phase,'party'); assert.equal(api().panel,'letter');
  api().closePanel(); api().onPanelRestored(); api().startApproach(); api().openPanel('gifts');
  assert.equal(api().phase,'approach'); assert.equal(api().panel,null);
});
test('unavailable WebGL leaves content readable without entering a stuck ceremony', () => {
  reset(); useParty.setState({phase:'party',sceneFailed:true}); api().startApproach();
  assert.equal(api().phase,'party'); api().openPanel('memories'); assert.equal(api().panel,'memories');
});
test('drag, pinch and pointer cancellation never become object clicks', () => {
  let now=1000; const g=createGestureGuard(() => now);
  g.down(1,10,10); g.move(1,13,12); g.up(1); assert.equal(g.blocked(),false);
  g.down(1,10,10); g.move(1,35,10); assert.equal(g.blocked(),true); g.up(1);
  assert.equal(g.blocked(),true); now+=221; assert.equal(g.blocked(),false);
  g.down(1,10,10); g.down(2,20,20); g.up(2); g.up(1); assert.equal(g.blocked(),true);
  now+=221; g.setUi(true); assert.equal(g.blocked(),true); g.setUi(false); assert.equal(g.blocked(),false); g.down(1,1,1); g.cancel(1); assert.equal(g.blocked(),true);
});
test('gift receipts survive reopening; invalid receipts and unavailable storage are safe', () => {
  const c=normalizeConfig({recipient:{name:'Anh Thư'},event:{date:'18.10'}});
  const key=giftKey(c); const storage={getItem:() => '{"box":1,"reward":2}'};
  assert.deepEqual(readReceipt(key,3,storage),{box:1,reward:2});
  for(const raw of ['oops','{}','{"box":-1,"reward":0}','{"box":0,"reward":10}'])
    assert.equal(readReceipt(key,3,{getItem:() => raw}),null);
  assert.equal(readReceipt(key,3,null),null);
  assert.equal(readReceipt(key,3,{getItem:() => {throw Error('blocked')}}),null);
  assert.notEqual(key,giftKey({...c,recipient:{...c.recipient,name:'Another person'}}));
  assert.notEqual(key,giftKey({...c,gifts:[{title:'New gift',message:'New surprise'}]}));
});
test('config defaults support old config, dynamic placeholders and empty optional sections', () => {
  const c=normalizeConfig({recipient:{name:'Thư',age:'17'},memories:[],gifts:[],scene:{quality:'nonsense'}});
  assert.equal(c.recipient.age,17); assert.equal(c.scene.quality,'high');
  assert.equal(makeT(c)('roomLetter'),'Lá thư'); assert.match(makeT(c)('hudGreeting'),/Thư/);
  assert.deepEqual(c.memories,[]); assert.deepEqual(c.gifts,[]);
  assert.equal(normalizeConfig({recipient:{age:1000},cake:{candles:100}}).recipient.age,150);
});
test('static batching reduces six same-material draws to one while preserving world bounds and cleanup', () => {
  const parent=new THREE.Group(); parent.position.set(20,0,0); parent.scale.setScalar(.0001);
  const root=new THREE.Group(); root.position.set(3,0,0); parent.add(root);
  const material=new THREE.MeshStandardMaterial({color:'#ff8fc0'});
  const originals=[];
  for(let i=0;i<6;i++) { const m=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material.clone()); m.position.x=i*2; root.add(m); originals.push(m); }
  const distinct=new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshStandardMaterial({color:'blue'})); root.add(distinct);
  const cleanup=batchStaticChildren(root);
  const visible=root.children.filter(x => (x as THREE.Mesh).isMesh && x.visible) as THREE.Mesh[];
  assert.equal(visible.length,2); assert.equal(originals.every(m => !m.visible),true);
  const merged=visible.find(m => m.name === 'static-batch:6')!;
  merged.geometry.computeBoundingBox();
  assert.ok(Math.abs(merged.geometry.boundingBox!.min.x+.5)<.001);
  assert.ok(Math.abs(merged.geometry.boundingBox!.max.x-10.5)<.001);
  assert.equal(merged.geometry.index!.count,6*36);
  cleanup(); assert.equal(originals.every(m => m.visible),true); assert.equal(root.children.length,7);
});
test('transparent and instanced meshes keep their own render paths', () => {
  const root=new THREE.Group(); const material=new THREE.MeshBasicMaterial({transparent:true,opacity:.5});
  root.add(new THREE.Mesh(new THREE.BoxGeometry(),material)); root.add(new THREE.Mesh(new THREE.BoxGeometry(),material));
  root.add(new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial(),5));
  const cleanup=batchStaticChildren(root); assert.equal(root.children.length,3); assert.equal(root.children.every(m=>m.visible),true); cleanup();
});

import { initialPhotoState, photoReducer } from '../src/ui/photoFlip';
import { HIGH_PROFILE, useQuality } from '../src/scene/quality';
import { PresentationBudget, glowMask } from '../src/scene/renderBudget';
import { PANEL_TIMING, smoothProgress } from '../src/scene/keepsakeLayout';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Envelope } from '../src/ui/Envelope';

test('panels wait for focus, animate closed, then restore before another action is accepted', () => {
  reset(); useParty.setState({phase:'party'});
  api().openPanel('letter',[1,2,3]); assert.equal(api().panelStage,'zooming-in');
  api().onPanelOpened(); api().onPanelHidden(); assert.equal(api().panelStage,'zooming-in');
  api().openPanel('gifts'); assert.equal(api().panel,'letter');
  api().onPanelFocused(); assert.equal(api().panelStage,'opening');
  api().onPanelOpened(); assert.equal(api().panelStage,'open');
  api().closePanel(); assert.equal(api().panelStage,'closing');
  api().startApproach(); assert.equal(api().phase,'party');
  api().onPanelHidden(); assert.equal(api().panelStage,'zooming-out'); assert.equal(api().panel,'letter');
  api().onPanelRestored(); assert.equal(api().panelStage,'idle'); assert.equal(api().panelFocus,null);
  api().openPanel('gifts'); assert.equal(api().panel,'gifts');
});
test('Escape during the zoom cancels without flashing a dialog; stale callbacks cannot reopen it', () => {
  reset(); useParty.setState({phase:'party'});api().openPanel('memories');api().closePanel();
  assert.equal(api().panelStage,'zooming-out');api().onPanelFocused();api().onPanelOpened();api().closePanel();
  assert.equal(api().panelStage,'zooming-out');api().onPanelRestored();assert.equal(api().panel,null);
});
test('failed WebGL uses the same content animations and completes closing without a camera', () => {
  reset(); useParty.setState({phase:'party',sceneFailed:true});api().openPanel('letter');
  assert.equal(api().panelStage,'opening');api().onPanelOpened();api().closePanel();api().onPanelHidden();
  assert.equal(api().panelStage,'idle');assert.equal(api().panel,null);api().openPanel('gifts');assert.equal(api().panel,'gifts');
});
test('photo flip keeps its front visible until completion and ignores an old animation callback', () => {
  let s=photoReducer(initialPhotoState(3),{type:'move',delta:1});
  assert.equal(s.index,0);assert.equal(s.turn?.from,0);assert.equal(s.turn?.to,1);assert.equal(s.turn?.direction,1);
  assert.equal(photoReducer(s,{type:'finish',id:999}),s);
  s=photoReducer(s,{type:'finish',id:s.turn!.id});assert.equal(s.index,1);assert.equal(s.turn,null);
});
test('rapid photo swipes queue the latest destination without interrupting a half-turned photograph', () => {
  let s=photoReducer(initialPhotoState(5),{type:'move',delta:1});const first=s.turn!.id;
  s=photoReducer(s,{type:'move',delta:1});s=photoReducer(s,{type:'move',delta:1});
  assert.equal(s.turn?.to,1);assert.equal(s.queue?.to,3);
  s=photoReducer(s,{type:'finish',id:first});assert.equal(s.index,1);assert.equal(s.turn?.to,3);
  s=photoReducer(s,{type:'finish',id:first});assert.equal(s.index,1);
  s=photoReducer(s,{type:'finish',id:s.turn!.id});assert.equal(s.index,3);assert.equal(s.turn,null);
});
test('photo flipping wraps backwards and cancels a queued move when the direction is reversed', () => {
  let s=photoReducer(initialPhotoState(3),{type:'move',delta:-1});
  assert.equal(s.turn?.to,2);assert.equal(s.turn?.direction,-1);
  s=photoReducer(s,{type:'move',delta:1});assert.equal(s.queue?.to,0);
  s=photoReducer(s,{type:'move',delta:-1});assert.equal(s.queue,null);
  s=photoReducer(s,{type:'finish',id:s.turn!.id});assert.equal(s.index,2);
});
test('closing photos settles the visible turn; changed or empty photo lists cannot leave invalid indices', () => {
  let s=photoReducer(initialPhotoState(5),{type:'select',index:4});
  s=photoReducer(s,{type:'move',delta:-1});s=photoReducer(s,{type:'settle'});
  assert.equal(s.index,4);assert.equal(s.queue,null);assert.equal(s.turn,null);
  s=photoReducer(s,{type:'sync',count:2});assert.equal(s.index,1);
  s=photoReducer(s,{type:'sync',count:0});assert.equal(s.index,0);
  assert.equal(photoReducer(s,{type:'move',delta:1}),s);
  s=initialPhotoState(1);assert.equal(photoReducer(s,{type:'move',delta:-1}),s);
});
test('old quality preferences and slow frames cannot downgrade high detail', () => {
  for(const pref of ['auto','low','medium','high'] as const) {
    useQuality.getState().applyPref(pref);
    assert.equal(useQuality.getState().tier,'high');assert.equal(useQuality.getState().locked,true);
    assert.equal(useQuality.getState().stepDown(),false);assert.equal(normalizeConfig({scene:{quality:pref}}).scene.quality,'high');
  }
  assert.equal(HIGH_PROFILE.shadowMap,2048);assert.equal(HIGH_PROFILE.dpr[1],2);assert.equal(HIGH_PROFILE.burst,480);
});
test('60 Hz presentations avoid redundant GPU work on high-refresh screens and resume after suspension', () => {
  for(const hz of [60,90,120,144]) {
    const budget=new PresentationBudget();let renders=0;
    for(let frame=0;frame<hz;frame++)if(budget.take(frame*1000/hz))renders++;
    assert.ok(renders>=59&&renders<=61,`${hz} Hz: ${renders} presentations`);
    assert.equal(budget.take(10000),true);assert.equal(budget.take(10001),false);
    assert.equal(budget.take(10002,true),true);
  }
});
test('glow extraction preserves cream and pale reflections while candle light still blooms', () => {
  assert.equal(glowMask([1,1,1]),0);assert.equal(glowMask([1.6,1.5,1.4]),0);
  assert.ok(glowMask([3.2,1.25,.2])>.95);
  assert.ok(glowMask([2.8,2.8,2.8])<glowMask([3.2,1.25,.2])*.25);
  assert.ok(Number.isFinite(glowMask([0,0,0])));
});
test('the closed intro envelope hides the inner letter before any opening transition', () => {
  const markup=renderToStaticMarkup(createElement(Envelope,{config:normalizeConfig({})}));
  const paper=markup.match(/<div[^>]*data-peek-letter[^>]*>/)?.[0];
  assert.ok(paper);assert.match(paper,/visibility:hidden/);assert.match(markup,/data-envelope-stage="closed"/);
});
test('focus easing is bounded and gradual, with exact endpoints for view restoration', () => {
  assert.equal(smoothProgress(-1),0);assert.equal(smoothProgress(2),1);assert.equal(smoothProgress(.5),.5);
  let prior=0;for(let i=0;i<=100;i++){const k=smoothProgress(i/100);assert.ok(k>=prior&&k<=1);prior=k;}
  assert.ok(smoothProgress(.01)<.001);assert.ok(PANEL_TIMING.zoom>1000);assert.ok(PANEL_TIMING.close>400);
});
