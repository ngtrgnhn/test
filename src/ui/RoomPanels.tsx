import { useEffect, useMemo, useRef, useState } from 'react';
import { makeT, type PartyConfig } from '../config';
import { useParty } from '../store';
import { LetterPaper } from './LetterPaper';
import { GiftPicker } from './Gifts';
import { CloseIcon, HeartIcon } from './icons';

function Gallery({ config, active }: { config: PartyConfig; active: boolean }) {
  const T = useMemo(() => makeT(config), [config]);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const item = config.memories[Math.min(index, Math.max(0, config.memories.length - 1))];
  const count = config.memories.length;
  useEffect(() => { setIndex(i => Math.min(i, Math.max(0, count - 1))); }, [count]);
  const move = (n: number) => setIndex(i => (i + n + count) % Math.max(1, count));
  useEffect(() => {
    if (!active || count < 2) return;
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [active, count]);
  if (!item) return <p className="panel-empty">{T('roomEmptyMemories')}</p>;
  return <div className="memory-viewer" aria-roledescription="carousel" aria-label={T('memoriesTitle')}>
    <div className="memory-photo" onPointerDown={e => { pointer.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={e => { const p = pointer.current; pointer.current = null; if (p && Math.abs(e.clientX - p.x) > 45 && Math.abs(e.clientY - p.y) < 60) move(e.clientX < p.x ? 1 : -1); }}
      onPointerCancel={() => { pointer.current = null; }}>
      {active && failed !== item.src && <img key={item.src} src={item.src} alt={item.caption || `Kỷ niệm ${index + 1}`} decoding="async" draggable={false} onError={() => setFailed(item.src)} />}
      {failed === item.src && <div className="memory-error"><HeartIcon className="w-12 h-12" /><p>{T('roomImageUnavailable')}</p><button onClick={() => setFailed(null)}>{T('roomImageRetry')}</button></div>}
      {count > 1 && <>
        <button className="photo-arrow photo-arrow--prev" aria-label={T('memoriesPrev')} onClick={() => move(-1)}>‹</button>
        <button className="photo-arrow photo-arrow--next" aria-label={T('memoriesNext')} onClick={() => move(1)}>›</button>
      </>}
    </div>
    <p className="photo-caption" aria-live="polite">{item.caption}</p>
    <div className="photo-index"><span>{Math.min(index + 1, count)} / {count}</span><div>{config.memories.map((m,i) => <button key={`${i}-${m.src}`} aria-label={T('memoriesGoto', { n: i + 1 })} aria-current={i === index ? 'true' : undefined} className={i === index ? 'active' : ''} onClick={() => setIndex(i)} />)}</div></div>
    <p className="photo-help">{T('roomGalleryHint')}</p>
  </div>;
}

/** Native dialog supplies a focus trap, Escape, and focus restoration. The room stays behind it. */
export default function RoomPanels({ config }: { config: PartyConfig }) {
  const panel = useParty(s => s.panel);
  const dialog = useRef<HTMLDialogElement>(null);
  const [visited, setVisited] = useState(false);
  const T = useMemo(() => makeT(config), [config]);
  const close = () => useParty.getState().closePanel();
  useEffect(() => {
    const el = dialog.current; if (!el) return;
    if (panel && !el.open) el.showModal();
    else if (!panel && el.open) el.close();
    if (panel === 'memories') setVisited(true);
  }, [panel]);
  const title = panel === 'letter' ? T('letterTitle') : panel === 'memories' ? T('memoriesTitle') : T('giftsTitle');
  return <dialog ref={dialog} className={`room-dialog room-dialog--${panel ?? 'closed'}`} data-ui aria-labelledby="room-panel-title"
    onCancel={e => { e.preventDefault(); close(); }} onClose={() => { if (!dialog.current?.open) close(); }}
    onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <section className="room-panel">
      <header className="panel-header"><div><span>{T('roomPanelBadge')}</span><h2 id="room-panel-title">{title}</h2></div><button className="panel-close" onClick={close} aria-label={T('roomClose')} title={T('roomClose')}><CloseIcon className="w-5 h-5" /></button></header>
      <div className="panel-body">
        <div hidden={panel !== 'letter'}><LetterPaper config={config} /></div>
        <div hidden={panel !== 'memories'}>{visited && <Gallery config={config} active={panel === 'memories'} />}</div>
        <div hidden={panel !== 'gifts'} className="gifts-panel"><p>{T('giftsSub')}</p><GiftPicker config={config} /></div>
      </div>
      <footer><button onClick={close}>← {T('roomClose')}</button></footer>
    </section>
  </dialog>;
}
