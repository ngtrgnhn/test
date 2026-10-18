import * as THREE from "three";

/* All textures are painted on canvas — zero network requests, crisp at any DPR.
   Everything that does not depend on config text is created once and shared. */

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, x: c.getContext("2d")! };
}

function toTexture(c: HTMLCanvasElement, srgb = true, aniso = 8) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
}

/** tiny deterministic PRNG so painted patterns never change between reloads */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/* ------------------------------------------------------------------ */
/* shading helpers                                                     */
/* ------------------------------------------------------------------ */

/** 5-step soft toon ramp (read as a linear multiplier by MeshToonMaterial) */
export function toonGradient(): THREE.Texture {
  return cached("toon", () => {
    const { c, x } = makeCanvas(5, 1);
    ["#858585", "#b8b8b8", "#dedede", "#f5f5f5", "#ffffff"].forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(i, 0, 1, 1);
    });
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  });
}

export function blobShadowTexture(): THREE.Texture {
  return cached("blob", () => {
    const { c, x } = makeCanvas(256, 256);
    const g = x.createRadialGradient(128, 128, 10, 128, 128, 126);
    g.addColorStop(0, "rgba(120,30,70,0.5)");
    g.addColorStop(0.6, "rgba(120,30,70,0.22)");
    g.addColorStop(1, "rgba(120,30,70,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
    return toTexture(c, false);
  });
}

/** soft round puff (smoke, breath) */
export function puffTexture(): THREE.Texture {
  return cached("puff", () => {
    const { c, x } = makeCanvas(128, 128);
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.5, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return toTexture(c, false);
  });
}

/** soft glow (halos around flames and bulbs) */
export function glowTexture(): THREE.Texture {
  return cached("glow", () => {
    const { c, x } = makeCanvas(128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.7)");
    g.addColorStop(0.45, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    return toTexture(c, false);
  });
}

/** four-point glitter star */
export function starTexture(): THREE.Texture {
  return cached("star", () => {
    const { c, x } = makeCanvas(128, 128);
    x.clearRect(0, 0, 128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = "rgba(255,255,255,0.95)";
    x.beginPath();
    x.moveTo(64, 2);
    x.quadraticCurveTo(68, 60, 126, 64);
    x.quadraticCurveTo(68, 68, 64, 126);
    x.quadraticCurveTo(60, 68, 2, 64);
    x.quadraticCurveTo(60, 60, 64, 2);
    x.fill();
    return toTexture(c, false);
  });
}

/** out-of-focus lamp disc (bokeh) */
export function bokehTexture(): THREE.Texture {
  return cached("bokeh", () => {
    const { c, x } = makeCanvas(128, 128);
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 62);
    g.addColorStop(0, "rgba(255,255,255,0.5)");
    g.addColorStop(0.8, "rgba(255,255,255,0.6)");
    g.addColorStop(0.93, "rgba(255,255,255,0.78)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(64, 64, 62, 0, Math.PI * 2);
    x.fill();
    return toTexture(c, false);
  });
}

export function heartTexture(): THREE.Texture {
  return cached("heart", () => {
    const { c, x } = makeCanvas(128, 128);
    const g = x.createRadialGradient(64, 60, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = "rgba(255,255,255,0.18)";
    x.fillRect(0, 0, 128, 128);
    x.clearRect(0, 0, 128, 128);
    x.fillStyle = "#ffffff";
    x.beginPath();
    x.moveTo(64, 108);
    x.bezierCurveTo(8, 70, 14, 22, 50, 24);
    x.bezierCurveTo(58, 25, 62, 32, 64, 38);
    x.bezierCurveTo(66, 32, 70, 25, 78, 24);
    x.bezierCurveTo(114, 22, 120, 70, 64, 108);
    x.fill();
    return toTexture(c, false);
  });
}

/** vertical light shaft: fades out at both ends and softly on the sides */
export function shaftTexture(): THREE.Texture {
  return cached("shaft", () => {
    const { c, x } = makeCanvas(64, 256);
    const gv = x.createLinearGradient(0, 0, 0, 256);
    gv.addColorStop(0, "rgba(255,255,255,1)");
    gv.addColorStop(0.55, "rgba(255,255,255,0.45)");
    gv.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = gv;
    x.fillRect(0, 0, 64, 256);
    x.globalCompositeOperation = "destination-in";
    const gh = x.createLinearGradient(0, 0, 64, 0);
    gh.addColorStop(0, "rgba(0,0,0,0)");
    gh.addColorStop(0.5, "rgba(0,0,0,1)");
    gh.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = gh;
    x.fillRect(0, 0, 64, 256);
    return toTexture(c, false);
  });
}

/* ------------------------------------------------------------------ */
/* room                                                                */
/* ------------------------------------------------------------------ */

/** warm parquet — planks of slightly different peach/cream tones */
export function parquetTexture(size = 1024): THREE.Texture {
  return cached(`parquet${size}`, () => {
    const { c, x } = makeCanvas(size, size);
    const rnd = rng(11);
    const rows = 12;
    const rh = size / rows;
    const len = size / 2;
    const pal = ["#f6d3bf", "#f1c8b2", "#fadccb", "#f3cdb8", "#eac0aa", "#f8d7c4"];
    x.fillStyle = "#d29a88";
    x.fillRect(0, 0, size, size);
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (len / 2) + (rnd() - 0.5) * 30;
      for (let k = -1; k <= 2; k++) {
        const x0 = off + k * len;
        const col = pal[Math.floor(rnd() * pal.length)];
        x.fillStyle = col;
        x.fillRect(x0 + 1.5, r * rh + 1.5, len - 3, rh - 3);
        // soft light falloff along the plank
        const g = x.createLinearGradient(x0, 0, x0 + len, 0);
        g.addColorStop(0, "rgba(255,255,255,0.14)");
        g.addColorStop(0.5, "rgba(255,255,255,0)");
        g.addColorStop(1, "rgba(180,100,90,0.10)");
        x.fillStyle = g;
        x.fillRect(x0 + 1.5, r * rh + 1.5, len - 3, rh - 3);
        // grain
        x.strokeStyle = "rgba(190,120,105,0.16)";
        x.lineWidth = 1.2;
        for (let j = 0; j < 5; j++) {
          const yy = r * rh + 6 + rnd() * (rh - 12);
          x.beginPath();
          x.moveTo(x0 + 6, yy);
          x.bezierCurveTo(x0 + len * 0.3, yy + (rnd() - 0.5) * 6, x0 + len * 0.7, yy + (rnd() - 0.5) * 6, x0 + len - 6, yy);
          x.stroke();
        }
      }
    }
    const t = toTexture(c, true, 8);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

/**
 * One tile of the round room wall (u = around the room, v = floor → ceiling, 13 units tall):
 * wainscot panels at the bottom, a chair rail, heart-sprinkled striped wallpaper above.
 */
export function wallTexture(size = 2048): THREE.Texture {
  return cached(`wall${size}`, () => {
    const { c, x } = makeCanvas(size, size);
    const W = size;
    const H = size;
    const rnd = rng(5);
    const wainscotTop = H * (1 - 3.1 / 13); // canvas y where the wainscot starts (v=0 is the bottom)
    const railH = H * (0.26 / 13);

    /* wallpaper */
    const wp = x.createLinearGradient(0, 0, 0, wainscotTop);
    wp.addColorStop(0, "#f7a9c8");
    wp.addColorStop(0.5, "#fbb9d2");
    wp.addColorStop(1, "#ffc8dc");
    x.fillStyle = wp;
    x.fillRect(0, 0, W, wainscotTop);
    // soft vertical stripes (8 per tile)
    const stripes = 12;
    const sw = W / stripes;
    for (let i = 0; i < stripes; i++) {
      x.fillStyle = i % 2 ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0)";
      x.fillRect(i * sw, 0, sw, wainscotTop);
    }
    // hearts + dots in a half-drop grid
    const cols = stripes / 2;
    const cw = W / cols;
    const rowsN = 12;
    const rh = wainscotTop / rowsN;
    for (let r = 0; r < rowsN + 1; r++) {
      for (let k = 0; k < cols + 1; k++) {
        const cx = k * cw + (r % 2 ? cw / 2 : 0) + sw * 0.5;
        const cy = r * rh;
        if ((r + k) % 3 === 0) {
          const s = 15 + rnd() * 4;
          x.fillStyle = "rgba(255,255,255,0.55)";
          x.beginPath();
          x.moveTo(cx, cy + s * 0.9);
          x.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
          x.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9);
          x.fill();
        } else {
          x.fillStyle = "rgba(255,255,255,0.34)";
          x.beginPath();
          x.arc(cx, cy, 5.5, 0, Math.PI * 2);
          x.fill();
        }
      }
    }
    // crown shadow at the very top
    const cr = x.createLinearGradient(0, 0, 0, H * 0.05);
    cr.addColorStop(0, "rgba(150,40,95,0.28)");
    cr.addColorStop(1, "rgba(150,40,95,0)");
    x.fillStyle = cr;
    x.fillRect(0, 0, W, H * 0.05);

    /* chair rail */
    x.fillStyle = "#fff4ee";
    x.fillRect(0, wainscotTop - railH * 0.5, W, railH);
    x.fillStyle = "rgba(190,100,130,0.35)";
    x.fillRect(0, wainscotTop + railH * 0.5, W, 5);
    x.fillStyle = "rgba(255,255,255,0.9)";
    x.fillRect(0, wainscotTop - railH * 0.5, W, 4);

    /* wainscot */
    const wy0 = wainscotTop + railH * 0.5 + 5;
    const wg = x.createLinearGradient(0, wy0, 0, H);
    wg.addColorStop(0, "#ffe9f0");
    wg.addColorStop(1, "#ffd6e4");
    x.fillStyle = wg;
    x.fillRect(0, wy0, W, H - wy0);
    const panels = 4;
    const pw = W / panels;
    const padX = pw * 0.1;
    const padTop = 34;
    const padBot = H * 0.035;
    for (let i = 0; i < panels; i++) {
      const px = i * pw + padX;
      const py = wy0 + padTop;
      const ww = pw - padX * 2;
      const hh = H - py - padBot;
      // bevel: dark top/left, light bottom/right
      x.strokeStyle = "rgba(195,105,140,0.55)";
      x.lineWidth = 7;
      x.beginPath();
      x.moveTo(px, py + hh);
      x.lineTo(px, py);
      x.lineTo(px + ww, py);
      x.stroke();
      x.strokeStyle = "rgba(255,255,255,0.95)";
      x.beginPath();
      x.moveTo(px + ww, py);
      x.lineTo(px + ww, py + hh);
      x.lineTo(px, py + hh);
      x.stroke();
      // inner field
      x.fillStyle = "rgba(255,255,255,0.35)";
      x.fillRect(px + 14, py + 14, ww - 28, hh - 28);
    }
    /* floor shadow (ambient occlusion) */
    const ao = x.createLinearGradient(0, H * 0.93, 0, H);
    ao.addColorStop(0, "rgba(160,60,100,0)");
    ao.addColorStop(1, "rgba(160,60,100,0.22)");
    x.fillStyle = ao;
    x.fillRect(0, H * 0.93, W, H * 0.07);

    const t = toTexture(c, true, 8);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

/** dusk sky seen through the window: stars, a moon, tiny rooftops with lit windows */
export function skyTexture(): THREE.Texture {
  return cached("sky", () => {
    const W = 512;
    const H = 640;
    const { c, x } = makeCanvas(W, H);
    const rnd = rng(23);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#241352");
    g.addColorStop(0.35, "#5b2a86");
    g.addColorStop(0.62, "#c5509a");
    g.addColorStop(0.82, "#ff8fb0");
    g.addColorStop(1, "#ffc59a");
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // stars
    for (let i = 0; i < 160; i++) {
      const sy = rnd() * H * 0.72;
      const a = 0.35 + rnd() * 0.65;
      const s = rnd() < 0.12 ? 2.6 : 1.3;
      x.fillStyle = `rgba(255,248,235,${a * (1 - sy / (H * 0.85))})`;
      x.beginPath();
      x.arc(rnd() * W, sy, s, 0, Math.PI * 2);
      x.fill();
    }
    // moon + halo
    const mx = W * 0.72;
    const my = H * 0.2;
    const mg = x.createRadialGradient(mx, my, 10, mx, my, 110);
    mg.addColorStop(0, "rgba(255,244,214,0.55)");
    mg.addColorStop(1, "rgba(255,244,214,0)");
    x.fillStyle = mg;
    x.fillRect(mx - 120, my - 120, 240, 240);
    x.fillStyle = "#fff5d9";
    x.beginPath();
    x.arc(mx, my, 40, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(235,205,160,0.55)";
    for (const [dx, dy, r] of [[-12, -8, 9], [10, 12, 6], [8, -16, 5]]) {
      x.beginPath();
      x.arc(mx + dx, my + dy, r, 0, Math.PI * 2);
      x.fill();
    }
    // far hills + rooftops
    x.fillStyle = "#7c2f78";
    x.beginPath();
    x.moveTo(0, H);
    x.lineTo(0, H * 0.84);
    for (let i = 0; i <= 8; i++) x.lineTo((i / 8) * W, H * (0.83 + Math.sin(i * 1.7) * 0.03));
    x.lineTo(W, H);
    x.fill();
    x.fillStyle = "#4d1c63";
    let bx = -10;
    while (bx < W) {
      const bw = 40 + rnd() * 56;
      const bh = 40 + rnd() * 90;
      const top = H - bh;
      x.fillRect(bx, top, bw, bh);
      if (rnd() < 0.5) {
        x.beginPath();
        x.moveTo(bx - 4, top);
        x.lineTo(bx + bw / 2, top - 22);
        x.lineTo(bx + bw + 4, top);
        x.fill();
      }
      // lit windows
      x.fillStyle = "rgba(255,214,140,0.95)";
      for (let wy = top + 12; wy < H - 8; wy += 24) {
        for (let wx = bx + 8; wx < bx + bw - 10; wx += 18) {
          if (rnd() < 0.35) x.fillRect(wx, wy, 8, 11);
        }
      }
      x.fillStyle = "#4d1c63";
      bx += bw + 4 + rnd() * 10;
    }
    return toTexture(c, true, 4);
  });
}

/* ------------------------------------------------------------------ */
/* table / rug                                                         */
/* ------------------------------------------------------------------ */

/** scalloped white lace doily for the table top (transparent outside) */
export function laceTexture(): THREE.Texture {
  return cached("lace", () => {
    const S = 1024;
    const { c, x } = makeCanvas(S, S);
    const cx = S / 2;
    const R = 484;
    const N = 40;
    // scalloped disc
    x.fillStyle = "#fffaf6";
    x.beginPath();
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const r = R - 18;
      const px = cx + Math.cos(am) * r;
      const py = cx + Math.sin(am) * r;
      const rad = (Math.PI * 2 * r) / N / 2 + 2;
      x.moveTo(px + rad, py);
      x.arc(px, py, rad, 0, Math.PI * 2);
    }
    x.arc(cx, cx, R - 26, 0, Math.PI * 2);
    x.fill();
    // punch eyelets (lace holes)
    x.globalCompositeOperation = "destination-out";
    for (const [rr, n, s] of [[R - 66, N, 9], [R - 112, N, 6], [R - 170, N / 2, 12], [R - 240, N / 2, 7]] as const) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (rr === R - 112 ? Math.PI / n : 0);
        x.beginPath();
        x.arc(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr, s, 0, Math.PI * 2);
        x.fill();
      }
    }
    // thin ring cut-outs
    x.lineWidth = 4;
    x.strokeStyle = "rgba(0,0,0,1)";
    for (const rr of [R - 40, R - 140, R - 205]) {
      x.setLineDash([14, 10]);
      x.beginPath();
      x.arc(cx, cx, rr, 0, Math.PI * 2);
      x.stroke();
    }
    x.setLineDash([]);
    x.globalCompositeOperation = "source-over";
    // faint pink under-shadow of the pattern
    x.strokeStyle = "rgba(255,170,205,0.5)";
    x.lineWidth = 3;
    x.beginPath();
    x.arc(cx, cx, R - 28, 0, Math.PI * 2);
    x.stroke();
    return toTexture(c, true, 8);
  });
}

/** painted rug: cream centre, pink rings, a ring of little hearts */
export function rugTexture(): THREE.Texture {
  return cached("rug", () => {
    const S = 1024;
    const { c, x } = makeCanvas(S, S);
    const m = S / 2;
    const g = x.createRadialGradient(m, m, 30, m, m, m);
    g.addColorStop(0, "#fff6f9");
    g.addColorStop(0.55, "#ffe6ef");
    g.addColorStop(1, "#ffd0e2");
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    const ring = (r: number, w: number, col: string, dash: number[] = []) => {
      x.setLineDash(dash);
      x.strokeStyle = col;
      x.lineWidth = w;
      x.beginPath();
      x.arc(m, m, r, 0, Math.PI * 2);
      x.stroke();
    };
    ring(496, 22, "#ff9ec6");
    ring(462, 8, "#ffffff");
    ring(430, 4, "rgba(255,92,158,0.7)", [3, 16]);
    ring(300, 14, "rgba(255,255,255,0.9)", [2, 30]);
    ring(210, 18, "rgba(255,158,198,0.45)");
    x.setLineDash([]);
    const heart = (cx: number, cy: number, s: number, rot: number, col: string) => {
      x.save();
      x.translate(cx, cy);
      x.rotate(rot);
      x.fillStyle = col;
      x.beginPath();
      x.moveTo(0, s * 0.9);
      x.bezierCurveTo(-s * 1.5, -s * 0.2, -s * 0.7, -s * 1.1, 0, -s * 0.35);
      x.bezierCurveTo(s * 0.7, -s * 1.1, s * 1.5, -s * 0.2, 0, s * 0.9);
      x.fill();
      x.restore();
    };
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      heart(m + Math.cos(a) * 365, m + Math.sin(a) * 365, 15, a + Math.PI / 2, i % 2 ? "#ff7fb1" : "#ffffff");
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.26;
      heart(m + Math.cos(a) * 250, m + Math.sin(a) * 250, 10, a + Math.PI / 2, "rgba(255,111,174,0.55)");
    }
    return toTexture(c, true, 8);
  });
}

/** sponge layers + jam lines, wrapped around a cake tier */
export function layerTexture(sponge: string, jam: string): THREE.Texture {
  return cached(`layer${sponge}${jam}`, () => {
    const { c, x } = makeCanvas(512, 128);
    const rnd = rng(sponge.length * 31 + jam.length);
    x.fillStyle = sponge;
    x.fillRect(0, 0, 512, 128);
    // crumb speckles
    x.fillStyle = "rgba(160,100,60,0.16)";
    for (let i = 0; i < 360; i++) x.fillRect(rnd() * 512, rnd() * 128, 2 + rnd() * 2, 2);
    // jam lines
    x.fillStyle = jam;
    for (const yy of [40, 86]) {
      x.beginPath();
      x.moveTo(0, yy);
      for (let i = 0; i <= 32; i++) x.lineTo((i / 32) * 512, yy + Math.sin(i * 1.3) * 2);
      for (let i = 32; i >= 0; i--) x.lineTo((i / 32) * 512, yy + 12 + Math.sin(i * 1.1) * 2.5);
      x.closePath();
      x.fill();
    }
    x.fillStyle = "rgba(255,255,255,0.35)";
    x.fillRect(0, 0, 512, 6);
    const t = toTexture(c, true, 4);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

export function strawberryTexture(): THREE.Texture {
  return cached("strawberry", () => {
    const { c, x } = makeCanvas(128, 128);
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#ff7a8e");
    g.addColorStop(1, "#e93258");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
    const rnd = rng(3);
    x.fillStyle = "#ffe9a8";
    for (let i = 0; i < 46; i++) {
      x.beginPath();
      x.ellipse(rnd() * 128, 10 + rnd() * 108, 1.9, 3, 0, 0, Math.PI * 2);
      x.fill();
    }
    const t = toTexture(c, true, 2);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

export function candleStripeTexture(base: string): THREE.Texture {
  return cached(`candle${base}`, () => {
    const { c, x } = makeCanvas(64, 128);
    x.fillStyle = base;
    x.fillRect(0, 0, 64, 128);
    x.strokeStyle = "rgba(255,255,255,0.88)";
    x.lineWidth = 9;
    for (let i = -2; i < 6; i++) {
      x.beginPath();
      x.moveTo(i * 24 - 20, 140);
      x.lineTo(i * 24 + 26, -12);
      x.stroke();
    }
    const t = toTexture(c, true, 4);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

/* ------------------------------------------------------------------ */
/* text textures (depend on config.json — callers memoise + dispose)  */
/* ------------------------------------------------------------------ */

function wrapText(
  x: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxW: number,
  lineH: number,
  font: string,
  color: string
) {
  x.font = font;
  x.fillStyle = color;
  x.textAlign = "center";
  x.textBaseline = "middle";
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (x.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  const y0 = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => x.fillText(l, cx, y0 + i * lineH));
}

/** The party banner the character holds — text comes straight from config.json */
export function bannerTexture(text: string, sub: string): THREE.Texture {
  const { c, x } = makeCanvas(1024, 400);
  // cloth
  x.fillStyle = "#e63f85";
  x.fillRect(0, 0, 1024, 400);
  const g = x.createLinearGradient(0, 0, 0, 400);
  g.addColorStop(0, "rgba(255,255,255,0.22)");
  g.addColorStop(0.45, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(90,21,57,0.30)");
  x.fillStyle = g;
  x.fillRect(0, 0, 1024, 400);
  // stitched double border
  x.strokeStyle = "#fff4f8";
  x.lineWidth = 14;
  x.strokeRect(26, 26, 1024 - 52, 400 - 52);
  x.setLineDash([4, 16]);
  x.lineWidth = 6;
  x.strokeRect(48, 48, 1024 - 96, 400 - 96);
  x.setLineDash([]);
  // corner hearts
  const heart = (cx: number, cy: number, s: number) => {
    x.fillStyle = "#ffd3e5";
    x.beginPath();
    x.moveTo(cx, cy + s * 0.85);
    x.bezierCurveTo(cx - s * 1.4, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
    x.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy - s * 0.2, cx, cy + s * 0.85);
    x.fill();
  };
  heart(86, 86, 16);
  heart(1024 - 86, 86, 16);
  heart(86, 400 - 86, 16);
  heart(1024 - 86, 400 - 86, 16);
  // text
  wrapText(x, text.toUpperCase(), 512, sub ? 178 : 200, 860, 84, "800 74px 'Baloo 2', sans-serif", "#fff7ec");
  if (sub) {
    wrapText(x, sub, 512, 292, 860, 46, "italic 600 34px 'Be Vietnam Pro', sans-serif", "#ffd3e5");
  }
  return toTexture(c);
}

/** Small round age badge that hangs under the topper. */
export function ageTagTexture(age: number): THREE.Texture {
  const { c, x } = makeCanvas(256, 128);
  x.clearRect(0, 0, 256, 128);
  x.fillStyle = "#fff4f8";
  x.strokeStyle = "#5a1539";
  x.lineWidth = 10;
  x.beginPath();
  x.moveTo(24, 8);
  x.lineTo(232, 8);
  x.lineTo(248, 24);
  x.lineTo(248, 104);
  x.lineTo(232, 120);
  x.lineTo(24, 120);
  x.lineTo(8, 104);
  x.lineTo(8, 24);
  x.closePath();
  x.fill();
  x.stroke();
  x.fillStyle = "#e63f85";
  x.font = "800 58px 'Baloo 2', sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(`${age}`, 128, 70);
  return toTexture(c);
}

/** Text printed on the cake's heart topper (cake.topper in config.json). Auto-fits. */
export function topperTexture(text: string): THREE.Texture {
  const { c, x } = makeCanvas(256, 256);
  x.clearRect(0, 0, 256, 256);
  const t = text.trim();
  if (t) {
    let size = 128;
    x.font = `800 ${size}px 'Baloo 2', sans-serif`;
    while (x.measureText(t).width > 176 && size > 30) {
      size -= 4;
      x.font = `800 ${size}px 'Baloo 2', sans-serif`;
    }
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.lineJoin = "round";
    x.lineWidth = Math.max(8, size * 0.12);
    x.strokeStyle = "rgba(150,25,80,0.9)";
    x.strokeText(t, 128, 134);
    x.fillStyle = "#fff7ec";
    x.fillText(t, 128, 134);
  }
  return toTexture(c);
}

/** Letters of the garland: one cell per pennant. White cell + dark letter so the vertex colour tints the flag. */
export const LETTER_CELL = { w: 128, h: 128, cols: 8, rows: 4 };
export function lettersTexture(letters: string[]): THREE.Texture {
  const { w, h, cols, rows } = LETTER_CELL;
  const { c, x } = makeCanvas(w * cols, h * rows);
  x.fillStyle = "#ffffff";
  x.fillRect(0, 0, c.width, c.height);
  x.font = "800 80px 'Baloo 2', sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  letters.slice(0, cols * rows).forEach((ch, i) => {
    const cx = (i % cols) * w + w / 2;
    const cy = Math.floor(i / cols) * h + h * 0.4;
    x.lineJoin = "round";
    x.lineWidth = 3;
    x.strokeStyle = "#5a1539";
    x.fillStyle = "#5a1539";
    x.fillText(ch, cx, cy + 4);
    x.strokeText(ch, cx, cy + 4);
  });
  return toTexture(c, true, 8);
}

/** Foil numeral balloon: chunky digit with metallic rose-gold fill. */
export function numeralTexture(digit: string): THREE.Texture {
  const S = 512;
  const { c, x } = makeCanvas(S, S);
  x.clearRect(0, 0, S, S);
  const font = `800 460px 'Baloo 2', sans-serif`;
  x.font = font;
  x.textAlign = "center";
  x.textBaseline = "middle";
  const cy = S * 0.54;
  // soft dark outline = the foil's sealed rim
  x.lineJoin = "round";
  x.lineWidth = 46;
  x.strokeStyle = "#b53a73";
  x.strokeText(digit, S / 2, cy);
  x.lineWidth = 30;
  x.strokeStyle = "#ffe3ef";
  x.strokeText(digit, S / 2, cy);
  // metallic body
  const g = x.createLinearGradient(0, S * 0.1, S, S * 0.9);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(0.28, "#ff9fc8");
  g.addColorStop(0.52, "#ffd0e4");
  g.addColorStop(0.78, "#ff7fb1");
  g.addColorStop(1, "#ffc2a0");
  x.fillStyle = g;
  x.fillText(digit, S / 2, cy);
  // glossy streak
  x.save();
  x.globalCompositeOperation = "source-atop";
  const hl = x.createLinearGradient(0, 0, S, 0);
  hl.addColorStop(0, "rgba(255,255,255,0)");
  hl.addColorStop(0.3, "rgba(255,255,255,0.65)");
  hl.addColorStop(0.42, "rgba(255,255,255,0)");
  hl.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = hl;
  x.fillRect(0, 0, S, S);
  x.restore();
  return toTexture(c, true, 8);
}

/** Polaroid frame (transparent window where the photo shows) + handwritten caption. */
export function polaroidFrameTexture(caption: string): THREE.Texture {
  const W = 256;
  const H = 300;
  const { c, x } = makeCanvas(W, H);
  x.fillStyle = "#fffaf6";
  x.fillRect(0, 0, W, H);
  x.clearRect(14, 14, W - 28, W - 28);
  x.fillStyle = "rgba(190,110,140,0.35)";
  x.fillRect(14, W - 15, W - 28, 2);
  const cap = caption.trim();
  if (cap) {
    let size = 26;
    x.font = `italic 600 ${size}px 'Be Vietnam Pro', sans-serif`;
    while (x.measureText(cap).width > W - 44 && size > 12) {
      size -= 1;
      x.font = `italic 600 ${size}px 'Be Vietnam Pro', sans-serif`;
    }
    x.fillStyle = "#8c2f58";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(cap, W / 2, W + (H - W) / 2 - 2);
  }
  return toTexture(c, true, 4);
}
