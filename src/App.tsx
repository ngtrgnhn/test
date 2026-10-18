import { Component, lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { DEFAULT_CONFIG, makeT } from './config';
import { useLiveConfig } from './useLiveConfig';
import { useParty } from './store';
import { dom, DEBUG } from './dom';
import { Experience } from './scene/Experience';
import { Effects, ShadowBudget } from './scene/Effects';
import { PROFILES, useQuality } from './scene/quality';
import { gesture } from './scene/gesture';
import { Envelope } from './ui/Envelope';
import { RoomHud } from './ui/RoomHud';
import { HeartIcon } from './ui/icons';
const RoomPanels = lazy(() => import('./ui/RoomPanels'));

class SceneBoundary extends Component<{ children: ReactNode; fallback: string }, { failed: boolean }> {
  state = { failed: false };
  componentDidCatch() { useParty.setState({ sceneFailed: true }); }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="scene-fallback">{this.props.fallback}</div>;
    return this.props.children;
  }
}
function fontsReady() {
  if (!document.fonts) return Promise.resolve();
  return Promise.race([
    Promise.all([document.fonts.load("800 74px 'Baloo 2'"), document.fonts.load("600 34px 'Be Vietnam Pro'"), document.fonts.ready]).catch(() => undefined),
    new Promise(r => setTimeout(r, 3000)),
  ]);
}

export default function App() {
  const { config, error } = useLiveConfig();
  const phase = useParty(s => s.phase);
  const panel = useParty(s => s.panel);
  const panelStage = useParty(s => s.panelStage);
  const enteredAt = useParty(s => s.enteredAt);
  const douse = useParty(s => s.douse);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [revealDone, setRevealDone] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);
  const tier = useQuality(s => s.tier);
  const profile = PROFILES[tier];
  useEffect(() => { if (config) useQuality.getState().applyPref(config.scene.quality); }, [config?.scene.quality]);
  useEffect(() => { dom.root = root; return () => { dom.root = null; }; }, [root]);
  useEffect(() => {
    if (!config || phase !== 'loading') return;
    let alive = true;
    fontsReady().then(() => { if (alive) useParty.setState({ phase: 'intro' }); });
    return () => { alive = false; };
  }, [config, phase]);
  useEffect(() => { if (config) document.title = makeT(config)('pageTitle'); }, [config]);
  useEffect(() => {
    const changed = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, []);
  const loading = useMemo(() => config ? makeT(config)('loading') : DEFAULT_CONFIG.ui.loading, [config]);
  const uiTarget = (e: React.PointerEvent) => (e.target as Element).closest('[data-ui]');
  return <div ref={setRoot} className="party-room"
    onPointerDownCapture={e => { gesture.setUi(!!uiTarget(e)); if (!uiTarget(e)) gesture.down(e.pointerId, e.clientX, e.clientY); }}
    onPointerMoveCapture={e => { gesture.setUi(!!uiTarget(e)); gesture.move(e.pointerId, e.clientX, e.clientY); }}
    onPointerUpCapture={e => gesture.up(e.pointerId)} onPointerCancelCapture={e => gesture.cancel(e.pointerId)}>
    {root && <SceneBoundary fallback={config ? makeT(config)('roomNoWebGL') : DEFAULT_CONFIG.ui.roomNoWebGL}><Canvas eventSource={root} eventPrefix="client"
      frameloop={!visible || phase === 'loading' || phase === 'intro' || (panel && panelStage !== 'zooming-in' && panelStage !== 'zooming-out') ? 'demand' : 'always'}
      dpr={profile.dpr} shadows="soft" camera={{ fov: 42, position: [4.2, 3.4, 7], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => { gl.setClearColor('#ffc9de'); gl.domElement.setAttribute('aria-label', 'Không gian sinh nhật 3D, kéo để xoay và chạm các vật thể để khám phá'); }}>
      {config && <Experience config={config} />}
      <Effects /><ShadowBudget />
    </Canvas></SceneBoundary>}
    <div className="room-vignette" />
    {config && <RoomHud config={config} />}
    {config && phase !== 'loading' && phase !== 'intro' && <Suspense fallback={panel ? <div className="panel-loading" data-ui role="status">{makeT(config)('roomPanelLoading')}</div> : null}><RoomPanels config={config} /></Suspense>}
    {config && phase === 'intro' && <div data-ui><Envelope config={config} /></div>}
    {phase === 'loading' && <div className="boot-screen"><HeartIcon className="w-12 h-12 anim-heart" /><p>{loading}</p></div>}
    {enteredAt !== null && !revealDone && <div className="party-reveal" onAnimationEnd={() => setRevealDone(true)} />}
    {douse > 0 && <div key={douse} className="party-douse" />}
    {DEBUG && error && <div className="config-error" role="status">{error} — đang giữ nội dung cũ</div>}
  </div>;
}
