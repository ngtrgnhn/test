import { useMemo } from 'react';
import { makeT, type PartyConfig } from '../config';
import { CEREMONY, useParty, type Panel } from '../store';
import { HeartIcon, EnvelopeIcon, CameraIcon, GiftIcon, CakeIcon } from './icons';

export function RoomHud({ config }: { config: PartyConfig }) {
  const phase = useParty(s => s.phase);
  const panel = useParty(s => s.panel);
  const failed = useParty(s => s.sceneFailed);
  const ready = useParty(s => s.charReady);
  const T = useMemo(() => makeT(config), [config]);
  if (phase === 'loading' || phase === 'intro') return null;
  const ceremony = CEREMONY.includes(phase);
  const current = phase === 'approach' ? ready ? 1 : 0 : phase === 'blowing' ? 2 : 3;
  const hint = phase === 'approach' ? ready ? T('tapToBlow') : T('approaching')
    : phase === 'blowing' ? T('blowingNow') : phase === 'blown' ? T('tapToRelight') : T('relighting');
  const shortcuts: { id: Panel; label: string; icon: typeof HeartIcon; show: boolean }[] = [
    { id: 'letter', label: T('roomLetter'), icon: EnvelopeIcon, show: true },
    { id: 'memories', label: T('roomMemories'), icon: CameraIcon, show: config.memories.length > 0 },
    { id: 'gifts', label: T('roomGifts'), icon: GiftIcon, show: config.gifts.length > 0 },
  ];
  return <div className={`room-hud ${panel ? 'room-hud--hidden' : ''}`} aria-hidden={!!panel}>
    <header className="room-heading">
      <span className="room-eyebrow ribbon-banner ribbon-banner--light">{T('roomUniverse')}</span>
      <h1>{config.recipient.name}</h1>
      <p><HeartIcon className="w-3.5 h-3.5" /> {T('hudAge')} {config.event.date && <span>· {config.event.date}</span>}</p>
    </header>
    {!ceremony && <>
      <div className="room-tools" data-ui>
        <button title={T('roomReset')} aria-label={T('roomReset')} onClick={() => useParty.getState().resetCamera()}>↺</button>
        <span className="quality-badge ribbon-banner" title="Chi tiết cao cố định — không tự giảm chất lượng">{T('roomQualityHigh')}</span>
      </div>
      <div className="room-dock" data-ui>
        <p className="orbit-hint ribbon-banner">{T('roomOrbitHint')}</p>
        <div className="room-nav ribbon-banner ribbon-banner--light" aria-label="Khám phá bữa tiệc">
          {shortcuts.filter(x => x.show).map(x => <button key={x.id} onClick={() => useParty.getState().openPanel(x.id)}><x.icon className="w-4 h-4" />{x.label}</button>)}
          <span className="nav-divider" />
          <button className="cake-action" disabled={failed} onClick={() => useParty.getState().startApproach()}><CakeIcon className="w-4 h-4" />{T('roomCandleAction')}</button>
        </div>
        <p className="room-caption ribbon-banner ribbon-banner--light">{T('roomClickHint')}</p>
      </div>
    </>}
    {ceremony && <div className="ceremony-dock" data-ui>
      <ol className="ribbon-banner" aria-label="Nghi thức điều ước">{config.ui.steps.map((s,i) => <li key={i} className={i === current ? 'active' : i < current ? 'done' : ''} aria-current={i === current ? 'step' : undefined}><i />{s}</li>)}</ol>
      <p className="ribbon-banner" role="status" aria-live="polite">{hint}</p>
      {(phase === 'approach' && ready || phase === 'blown') && <button onClick={() => phase === 'blown' ? useParty.getState().requestRelight() : useParty.getState().requestBlow()}>{hint}</button>}
    </div>}
  </div>;
}
