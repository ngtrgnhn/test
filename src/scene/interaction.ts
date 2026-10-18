import { useParty } from '../store';
import { gesture } from './gesture';

export function cakeIsClickable(): boolean {
  const s = useParty.getState();
  if (s.panel || gesture.blocked()) return false;
  return s.phase === 'party' || s.phase === 'approach' && s.charReady || s.phase === 'blown';
}
export function roomIsInteractive(): boolean {
  const s = useParty.getState();
  return s.phase === 'party' && !s.panel && !gesture.blocked();
}
export const balloonsPoppable = roomIsInteractive;
export const breath = { active: false, dx: 0, dz: -1 };
