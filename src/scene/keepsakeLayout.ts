import type { Panel } from '../store';
export function keepsakePosition(id: Panel, aspect: number): [number,number,number] {
  const small = aspect < .85;
  if(id === 'letter') return small ? [-1.8,2.35,1.65] : [-2.65,2.45,1.05];
  if(id === 'memories') return small ? [2.1,2.75,.15] : [2.7,2.75,-.2];
  return small ? [.1,3.35,-2] : [.2,2.9,-2.9];
}
export const PANEL_TIMING = { zoom:1100, open:560, close:440, reduced:24 };
export const smoothProgress = (v: number) => {
  const t = Math.max(0,Math.min(1,v));
  return t*t*t*(t*(t*6-15)+10);
};
