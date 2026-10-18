import { useEffect, useMemo, useRef, useState } from 'react';
import { makeT, type PartyConfig } from '../config';
import { useParty } from '../store';
import { PANEL_TIMING } from '../scene/keepsakeLayout';
import { useQuality } from '../scene/quality';
import { Gallery } from './Gallery';
import { LetterPaper } from './LetterPaper';
import { GiftPicker } from './Gifts';
import { CloseIcon } from './icons';

/** Keep the native focus trap alive until the closing animation has finished. */
export default function RoomPanels({ config }: { config: PartyConfig }) {
  const panel = useParty(s => s.panel);
  const stage = useParty(s => s.panelStage);
  const failed = useParty(s => s.sceneFailed);
  const reduce = useQuality(s => s.reduceMotion);
  const dialog = useRef<HTMLDialogElement>(null);
  const [visited, setVisited] = useState(false);
  const T = useMemo(() => makeT(config), [config]);
  const close = () => {
    const stage = useParty.getState().panelStage;
    if (stage === 'closing' || stage === 'zooming-out') return;
    const body = dialog.current?.querySelector<HTMLElement>('.room-panel');
    if (body && dialog.current?.open) {
      const visual = getComputedStyle(body);
      body.style.setProperty('--panel-close-start', visual.transform);
      body.style.setProperty('--panel-close-opacity', visual.opacity);
    }
    useParty.getState().closePanel();
  };
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const visible = stage === 'opening' || stage === 'open' || stage === 'closing';
    if (visible && !el.open) el.showModal();
    else if (!visible && el.open) el.close();
    if (panel === 'memories' && visible) setVisited(true);
  }, [panel, stage]);
  useEffect(() => {
    // A failed canvas must never leave the content waiting for a camera callback.
    if (!failed) return;
    if (stage === 'zooming-in') useParty.getState().onPanelFocused();
    if (stage === 'zooming-out') useParty.getState().onPanelRestored();
  }, [failed, stage]);
  useEffect(() => {
    if (stage !== 'opening' && stage !== 'closing') return;
    const timer = setTimeout(() => {
      if (stage === 'opening') useParty.getState().onPanelOpened();
      else useParty.getState().onPanelHidden();
    }, reduce ? 40 : PANEL_TIMING[stage === 'opening' ? 'open' : 'close'] + 80);
    return () => clearTimeout(timer);
  }, [stage, reduce]);
  useEffect(() => {
    if (stage !== 'zooming-in') return;
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [stage]);
  const title = panel === 'letter' ? T('letterTitle') : panel === 'memories' ? T('memoriesTitle') : T('giftsTitle');
  return <dialog ref={dialog} className={`room-dialog room-dialog--${panel ?? 'closed'}`} data-state={stage} data-ui aria-labelledby="room-panel-title"
    onCancel={e => { e.preventDefault(); close(); }}
    onClose={() => { if (useParty.getState().panelStage === 'open' || useParty.getState().panelStage === 'opening') close(); }}
    onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <section className="room-panel" onAnimationEnd={e => {
      if (e.target !== e.currentTarget) return;
      if (stage === 'opening') useParty.getState().onPanelOpened();
      if (stage === 'closing') useParty.getState().onPanelHidden();
    }}>
      <header className="panel-header"><div><span className="ribbon-banner ribbon-banner--light">{T('roomPanelBadge')}</span><h2 id="room-panel-title">{title}</h2></div><button className="panel-close" onClick={close} aria-label={T('roomClose')} title={T('roomClose')}><CloseIcon className="w-5 h-5" /></button></header>
      <div className="panel-body">
        <div hidden={panel !== 'letter'}><LetterPaper config={config} /></div>
        <div hidden={panel !== 'memories'}>{visited && <Gallery config={config} active={panel === 'memories' && stage !== 'zooming-out'} />}</div>
        <div hidden={panel !== 'gifts'} className="gifts-panel"><p>{T('giftsSub')}</p><GiftPicker config={config} /></div>
      </div>
      <footer><button onClick={close}>← {T('roomClose')}</button></footer>
    </section>
  </dialog>;
}
