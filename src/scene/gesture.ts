/** A completed orbit / pinch is never a click on a cake, balloon or floating object. */
export function createGestureGuard(now: () => number = () => performance.now()) {
  const pointers = new Map<number, { x: number; y: number }>();
  let moved = false;
  let until = 0;
  let overUi = false;
  return {
    setUi(value: boolean) { overUi = value; },
    down(id: number, x: number, y: number) {
      if (!pointers.size) moved = false;
      pointers.set(id, { x, y });
      if (pointers.size > 1) moved = true;
    },
    move(id: number, x: number, y: number) {
      const p = pointers.get(id);
      if (p && Math.hypot(x - p.x, y - p.y) > 6) moved = true;
    },
    up(id: number) {
      if (moved) until = now() + 220;
      pointers.delete(id);
    },
    cancel(id: number) { pointers.delete(id); until = now() + 220; },
    blocked() { return overUi || moved && pointers.size > 0 || now() < until; },
  };
}
export const gesture = createGestureGuard();
