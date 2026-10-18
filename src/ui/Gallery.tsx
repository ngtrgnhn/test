import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { makeT, type PartyConfig } from '../config';
import { useQuality } from '../scene/quality';
import { HeartIcon } from './icons';
import { initialPhotoState, photoReducer } from './photoFlip';

function Photo({src,caption,config}:{src:string;caption:string;config:PartyConfig}) {
  const [failed,setFailed]=useState(false);
  const T=makeT(config);
  if(failed) return <div className="memory-error"><HeartIcon className="w-12 h-12"/><p>{T('roomImageUnavailable')}</p><button onClick={()=>setFailed(false)}>{T('roomImageRetry')}</button></div>;
  return <img src={src} alt={caption} decoding="async" draggable={false} onError={()=>setFailed(true)}/>;
}
export function Gallery({config,active}:{config:PartyConfig;active:boolean}) {
  const T=useMemo(()=>makeT(config),[config]);
  const [s,dispatch]=useReducer(photoReducer,config.memories.length,initialPhotoState);
  const reduce=useQuality(q=>q.reduceMotion);
  const pointer=useRef<{x:number;y:number}|null>(null);
  const signature=config.memories.map(m=>m.src).join('\n');
  useEffect(()=>{dispatch({type:'sync',count:config.memories.length});},[signature,config.memories.length]);
  useEffect(()=>{if(!active)dispatch({type:'settle'});},[active]);
  useEffect(()=>{
    if(!s.turn) return;
    const id=s.turn.id;
    const timer=setTimeout(()=>dispatch({type:'finish',id}),reduce ? 40 : 850);
    return ()=>clearTimeout(timer);
  },[s.turn?.id,reduce]);
  useEffect(()=>{
    if(!active || s.count<2) return;
    const keys=(e:KeyboardEvent)=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();dispatch({type:'move',delta:e.key==='ArrowRight'?1:-1});}};
    window.addEventListener('keydown',keys);return ()=>window.removeEventListener('keydown',keys);
  },[active,s.count]);
  useEffect(()=>{
    if(!active || !s.count)return;
    for(const i of [(s.index+1)%s.count,(s.index+s.count-1)%s.count]) {
      const image=new Image();image.decoding='async';image.src=config.memories[i]?.src ?? '';
    }
  },[active,s.index,s.count,signature]);
  const item=config.memories[s.index];
  if(!item)return <p className="panel-empty">{T('roomEmptyMemories')}</p>;
  const turn=s.turn;
  const target=turn ? config.memories[turn.to] : null;
  return <div className="memory-viewer" aria-roledescription="carousel" aria-label={T('memoriesTitle')}>
    <div className="memory-photo photo-book" aria-busy={!!turn}
      onPointerDown={e=>{pointer.current={x:e.clientX,y:e.clientY};}}
      onPointerUp={e=>{const p=pointer.current;pointer.current=null;if(p&&Math.abs(e.clientX-p.x)>45&&Math.abs(e.clientY-p.y)<60)dispatch({type:'move',delta:e.clientX<p.x?1:-1});}}
      onPointerCancel={()=>{pointer.current=null;}}>
      <div className="photo-stack" aria-hidden/>
      {active && <div key={turn?.id ?? `still-${s.index}`} className={`photo-sheet ${turn ? turn.direction===1?'photo-sheet--next':'photo-sheet--prev' : ''}`}
        onAnimationEnd={e=>{if(e.target===e.currentTarget&&turn)dispatch({type:'finish',id:turn.id});}}>
        <div className="photo-face photo-face--front"><Photo key={item.src} src={item.src} caption={item.caption} config={config}/></div>
        {target && <div className="photo-face photo-face--back" aria-hidden><Photo key={target.src} src={target.src} caption="" config={config}/></div>}
        <div className="photo-fold-shade" aria-hidden/>
      </div>}
      {s.count>1 && <><button className="photo-arrow photo-arrow--prev" aria-label={T('memoriesPrev')} onClick={()=>dispatch({type:'move',delta:-1})}>‹</button><button className="photo-arrow photo-arrow--next" aria-label={T('memoriesNext')} onClick={()=>dispatch({type:'move',delta:1})}>›</button></>}
    </div>
    <p className="photo-caption" aria-live="polite">{item.caption}</p>
    <div className="photo-index"><span>{s.index+1} / {s.count}</span><div>{config.memories.map((m,i)=><button key={`${i}-${m.src}`} aria-label={T('memoriesGoto',{n:i+1})} aria-current={i===s.index?'true':undefined} className={i===s.index?'active':''} onClick={()=>dispatch({type:'select',index:i})}/>)}</div></div>
    <p className="photo-help ribbon-banner ribbon-banner--light">{T('roomGalleryHint')}</p>
  </div>;
}
