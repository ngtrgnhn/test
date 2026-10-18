/** DOM handles shared between the React-DOM overlay and the 3D scene. */
export const dom = { root: null as HTMLElement | null };

/** The pointer is over a DOM overlay, not the canvas — so the cursor must be set on the shared root. */
export function setCursor(cursor: "pointer" | "") {
  if (dom.root) dom.root.style.cursor = cursor;
}

export const DEBUG =
  import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug");
