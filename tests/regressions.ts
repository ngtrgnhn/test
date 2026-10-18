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
  api().closePanel(); api().startApproach(); api().openPanel('gifts');
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
  assert.equal(c.recipient.age,17); assert.equal(c.scene.quality,'auto');
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
