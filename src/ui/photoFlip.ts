export type TurnDirection = 1 | -1;
export interface PhotoTurn { from:number; to:number; direction:TurnDirection; id:number }
export interface PhotoState { index:number; count:number; sequence:number; turn:PhotoTurn|null; queue:{to:number;direction:TurnDirection}|null }
export type PhotoAction = {type:'move';delta:TurnDirection}|{type:'select';index:number}|{type:'finish';id:number}|{type:'sync';count:number}|{type:'settle'};
export const initialPhotoState = (count:number):PhotoState => ({index:0,count,sequence:0,turn:null,queue:null});
const wrap = (i:number,count:number) => count ? (i%count+count)%count : 0;
export function photoReducer(s:PhotoState,a:PhotoAction):PhotoState {
  if(a.type === 'sync') return {...initialPhotoState(a.count), index:Math.min(s.index,Math.max(0,a.count-1)),sequence:s.sequence+1};
  if(a.type === 'settle') return {...s,index:s.turn?.to ?? s.index,turn:null,queue:null};
  if(a.type === 'finish') {
    if(!s.turn || a.id !== s.turn.id) return s;
    const index=s.turn.to;
    if(s.queue && s.queue.to !== index) {
      const sequence=s.sequence+1;
      return {...s,index,sequence,turn:{from:index,to:s.queue.to,direction:s.queue.direction,id:sequence},queue:null};
    }
    return {...s,index,turn:null,queue:null};
  }
  if(s.count < 2) return s;
  const planned=s.queue?.to ?? s.turn?.to ?? s.index;
  const to=wrap(a.type === 'move' ? planned+a.delta : a.index,s.count);
  const direction:TurnDirection=a.type === 'move' ? a.delta : to < planned ? -1 : 1;
  if(s.turn) return {...s,queue:to === s.turn.to ? null : {to,direction}};
  if(to === s.index) return s;
  const sequence=s.sequence+1;
  return {...s,sequence,turn:{from:s.index,to,direction,id:sequence},queue:null};
}
