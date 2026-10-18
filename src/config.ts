/**
 * Single source of truth for every piece of content shown on the page.
 *
 *  - `public/config.json` is what the author edits.
 *  - `normalizeConfig()` turns whatever JSON it finds into a complete, typed
 *    `PartyConfig` (missing keys get defaults, wrong types are coerced).
 *  - `useLiveConfig()` (see ./useLiveConfig.ts) keeps the page in sync with the
 *    file: no hard refresh needed.
 *  - Every UI string lives under `ui` so nothing visible is hard-coded in JSX.
 */

export interface GiftItem {
  title: string;
  message: string;
}
export interface MemoryItem {
  src: string;
  caption: string;
}

export type QualityPref = "auto" | "high" | "medium" | "low";

export interface UiTexts {
  /* intro / envelope */
  envelopeLabel: string;
  envelopeFrom: string;
  envelopeAddress: string;
  envelopeAddressFrom: string;
  envelopeTap: string;
  letterFlying: string;
  enterHint: string;
  enterAria: string;
  loading: string;
  /* HUD */
  hudGreeting: string;
  hudAge: string;
  scrollHint: string;
  tapCake: string;
  steps: string[];
  approaching: string;
  tapToBlow: string;
  blowingNow: string;
  tapToRelight: string;
  relighting: string;
  /* letter section */
  letterBadge: string;
  letterTitle: string;
  letterSub: string;
  letterNote: string;
  /* memories */
  memoriesBadge: string;
  memoriesTitle: string;
  memoriesSub: string;
  memoriesSwipe: string;
  memoriesDrag: string;
  memoriesPrev: string;
  memoriesNext: string;
  memoriesGoto: string;
  /* gifts */
  giftsBadge: string;
  giftsTitle: string;
  giftsSub: string;
  giftBox: string;
  giftOpening: string;
  giftChosen: string;
  giftNote: string;
  /* footer / page */
  footerMade: string;
  footerBy: string;
  footerNote: string;
  pageTitle: string;
  roomLetter: string;
  roomMemories: string;
  roomGifts: string;
  roomLetterSub: string;
  roomMemoriesSub: string;
  roomGiftsSub: string;
  roomOrbitHint: string;
  roomClickHint: string;
  roomClose: string;
  roomUniverse: string;
  roomReset: string;
  roomQuality: string;
  roomQualityAuto: string;
  roomQualityHigh: string;
  roomQualityMedium: string;
  roomQualityLow: string;
  roomCandleAction: string;
  roomPanelBadge: string;
  roomPanelLoading: string;
  roomImageUnavailable: string;
  roomImageRetry: string;
  roomGalleryHint: string;
  roomEmptyMemories: string;
  roomNoWebGL: string;
}

export interface PartyConfig {
  recipient: { name: string; nickname: string; age: number };
  sender: { name: string; signature: string };
  event: { kicker: string; title: string; date: string; place: string; time: string };
  letter: { heading: string; body: string; wish: string; ps: string };
  banner: { text: string; sub: string };
  cake: { candles: number; flavor: string; topper: string };
  memories: MemoryItem[];
  gifts: GiftItem[];
  hints: { approach: string; blowing: string; blown: string; relight: string };
  scene: { garland: string; quality: QualityPref };
  ui: UiTexts;
}

export type UiKey = Exclude<keyof UiTexts, "steps">;

/* ------------------------------------------------------------------ */
/* Defaults — used only to fill keys that are missing from config.json */
/* ------------------------------------------------------------------ */
export const DEFAULT_CONFIG: PartyConfig = {
  recipient: { name: "Bạn", nickname: "cậu", age: 18 },
  sender: { name: "Tớ", signature: "— Tớ, người luôn đứng về phía cậu" },
  event: {
    kicker: "Lá thư chúc mừng sinh nhật",
    title: "Gửi cậu của hôm nay",
    date: "",
    place: "",
    time: "",
  },
  letter: {
    heading: "Gửi bạn,",
    body: "Hôm nay là ngày của cậu. Tớ đã định viết thật dài, nhưng rồi nhận ra có những điều chỉ cần nói gọn trong một câu. Cảm ơn cậu vì một năm qua đã luôn ở đó — dịu dàng, kiên nhẫn và ấm áp theo cách không ai thay thế được.",
    wish: "Điều ước duy nhất tớ gửi vào ngọn nến: mong tuổi mới của cậu luôn rạng rỡ như chính cậu của hôm nay — phần còn lại của thế giới, cứ để tụi tớ lo.",
    ps: "Tái bút: xoay nhìn quanh phòng nhé, tớ giấu vài món nhỏ xinh bên chiếc bánh kem.",
  },
  banner: { text: "TUỔI MỚI RỰC RỠ NHÉ!", sub: "thương cậu nhiều hơn hôm qua, ít hơn ngày mai" },
  cake: { candles: 5, flavor: "kem dâu", topper: "HB" },
  memories: [],
  gifts: [
    { title: "Phiếu trà sữa", message: "Một chầu trà sữa không giới hạn — tớ mời, cậu uống, hết thì mình gọi thêm." },
    { title: "Vé xem phim", message: "Một vé xem phim kèm bỏng ngô cỡ lớn, có giá trị vào bất kỳ ngày nào cậu muốn." },
    { title: "Cái ôm năm tuổi mới", message: "Một cái ôm thật chặt, dùng được bất cứ lúc nào trong năm — kể cả ngày trời mưa." },
  ],
  hints: {
    approach: "Nhắm mắt, chắp tay — một điều ước đang thành hình...",
    blowing: "Hít một hơi thật sâu... và thổi!",
    blown: "Điều ước đã bay lên cùng làn khói",
    relight: "Ánh lửa nhỏ trở lại, bữa tiệc tiếp tục",
  },
  scene: { garland: "HAPPY BIRTHDAY", quality: "high" },
  ui: {
    roomLetter: "Lá thư",
    roomMemories: "Kỷ niệm",
    roomGifts: "Quà bí mật",
    roomLetterSub: "một lời thương gửi cậu",
    roomMemoriesSub: "{n} mảnh ký ức",
    roomGiftsSub: "một chút bất ngờ",
    roomOrbitHint: "Kéo để xoay · Cuộn hoặc chụm hai ngón để thu phóng",
    roomClickHint: "Chạm bánh kem hoặc những món đồ lơ lửng để khám phá",
    roomClose: "Trở về bữa tiệc",
    roomUniverse: "MỘT VŨ TRỤ NHỎ DÀNH CHO",
    roomReset: "Về góc nhìn ban đầu",
    roomQuality: "Chất lượng đồ họa",
    roomQualityAuto: "Tự động",
    roomQualityHigh: "Chi tiết cao",
    roomQualityMedium: "Cân bằng",
    roomQualityLow: "Tiết kiệm",
    roomCandleAction: "Thổi nến",
    roomPanelBadge: "NHỮNG ĐIỀU NHỎ XINH",
    roomPanelLoading: "Đang mở món quà nhỏ…",
    roomImageUnavailable: "Ảnh này chưa tải được.",
    roomImageRetry: "Thử lại",
    roomGalleryHint: "Vuốt hoặc dùng phím ← → để lật từng tấm ảnh",
    roomEmptyMemories: "Những kỷ niệm mới đang chờ được viết.",
    roomNoWebGL: "Trình duyệt chưa mở được cảnh 3D. Bạn vẫn có thể đọc thư, xem ảnh và mở quà qua các nút bên dưới.",
    envelopeLabel: "Lá thư dành cho",
    envelopeFrom: "từ {sender} — mở ra đọc nhé",
    envelopeAddress: "Gửi: {name}",
    envelopeAddressFrom: "từ: {sender}",
    envelopeTap: "nhấn vào phong bì để mở",
    letterFlying: "lá thư đang bay ra...",
    enterHint: "chạm vào trái tim ở góc thư để vào tiệc",
    enterAria: "Vào tiệc",
    loading: "Đang chuẩn bị bánh kem...",
    hudGreeting: "Chúc mừng sinh nhật {name}",
    hudAge: "tròn {age} tuổi",
    scrollHint: "Cuộn xuống đọc thư",
    tapCake: "chạm vào chiếc bánh {flavor} để lại gần",
    steps: ["lại gần", "cầu nguyện", "thổi nến", "điều ước"],
    approaching: "cô bé đang tới...",
    tapToBlow: "nhấn vào bánh kem để thổi nến",
    blowingNow: "hít sâu... thổi!",
    tapToRelight: "nhấn vào bánh kem để thắp lại nến",
    relighting: "đang thắp nến...",
    letterBadge: "phong thư đã mở",
    letterTitle: "Lá thư dành cho {nickname}",
    letterSub: "nắn nót từng chữ, chỉ chờ {nickname} đọc — một lời chúc duy nhất nằm ngay trong đó",
    letterNote: "Đọc xong hãy trở về bữa tiệc và chạm bánh kem để **thổi nến** nhé.",
    memoriesBadge: "năm qua của tụi mình",
    memoriesTitle: "Ảnh kỷ niệm",
    memoriesSub: "mỗi tấm là một ngày vui — vuốt ngang để lật xem từng chút một",
    memoriesSwipe: "vuốt sang ngang để xem từng tấm",
    memoriesDrag: "kéo chuột hoặc lăn con lăn để lướt xem ảnh",
    memoriesPrev: "Ảnh trước",
    memoriesNext: "Ảnh sau",
    memoriesGoto: "Xem ảnh số {n}",
    giftsBadge: "bí mật nhỏ",
    giftsTitle: "Ba hộp quà",
    giftsSub: "chọn một hộp bằng linh cảm — món quà bên trong là ngẫu nhiên, và chỉ mở được một lần duy nhất",
    giftBox: "hộp số {n}",
    giftOpening: "đang mở hộp...",
    giftChosen: "định mệnh đã chọn",
    giftNote: "quà ngẫu nhiên, chỉ mở một lần — quà thật sẽ đến tay {nickname} sớm thôi",
    footerMade: "làm với thật nhiều",
    footerBy: "bởi {sender}",
    footerNote: "cuộn lên đầu trang để thổi nến lại bất cứ lúc nào",
    pageTitle: "Chúc mừng sinh nhật {name}",
  },
};

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */
type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const rec = (v: unknown): Rec => (isRec(v) ? v : {});

const str = (v: unknown, d: string): string =>
  typeof v === "string" ? v : typeof v === "number" || typeof v === "boolean" ? String(v) : d;

const num = (v: unknown, d: number, min: number, max: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

function strings<T extends object>(src: unknown, def: T): T {
  const o = rec(src);
  const out: Rec = {};
  for (const k of Object.keys(def) as (keyof T & string)[]) {
    out[k] = str(o[k], (def as Rec)[k] as string);
  }
  return out as T;
}

/**
 * Turns any JSON value into a complete, safe `PartyConfig`.
 * Keys present in config.json always win; only missing/invalid ones fall back.
 */
export function normalizeConfig(raw: unknown): PartyConfig {
  const o = rec(raw);
  const D = DEFAULT_CONFIG;

  const recipientRaw = rec(o.recipient);
  const cakeRaw = rec(o.cake);
  const sceneRaw = rec(o.scene);
  const uiRaw = rec(o.ui);

  const memories = Array.isArray(o.memories)
    ? o.memories
        .map((m) => ({ src: str(rec(m).src, "").trim(), caption: str(rec(m).caption, "") }))
        .filter((m) => m.src)
    : D.memories;

  const gifts = Array.isArray(o.gifts)
    ? o.gifts
        .map((g) => ({ title: str(rec(g).title, ""), message: str(rec(g).message, "") }))
        .filter((g) => g.title || g.message)
    : D.gifts;

  const ui = strings(uiRaw, D.ui) as UiTexts;
  ui.steps =
    Array.isArray(uiRaw.steps) && uiRaw.steps.length > 0
      ? D.ui.steps.map((d, i) => str((uiRaw.steps as unknown[])[i], d))
      : D.ui.steps;

  return {
    recipient: {
      name: str(recipientRaw.name, D.recipient.name),
      nickname: str(recipientRaw.nickname, D.recipient.nickname),
      age: Math.round(num(recipientRaw.age, D.recipient.age, 0, 150)),
    },
    sender: strings(o.sender, D.sender),
    event: strings(o.event, D.event),
    letter: strings(o.letter, D.letter),
    banner: strings(o.banner, D.banner),
    cake: {
      candles: Math.round(num(cakeRaw.candles, D.cake.candles, 1, 12)),
      flavor: str(cakeRaw.flavor, D.cake.flavor),
      topper: str(cakeRaw.topper, D.cake.topper),
    },
    memories,
    gifts,
    hints: strings(o.hints, D.hints),
    scene: { garland: str(sceneRaw.garland, D.scene.garland), quality: "high" },
    ui,
  };
}

/* ------------------------------------------------------------------ */
/* Text templating: "{name}", "{nickname}", "{age}", "{sender}" …      */
/* ------------------------------------------------------------------ */
export type Vars = Record<string, string | number>;

export function fmt(tpl: string, vars: Vars): string {
  return tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function varsOf(c: PartyConfig): Vars {
  return {
    name: c.recipient.name,
    nickname: c.recipient.nickname,
    age: c.recipient.age,
    sender: c.sender.name,
    date: c.event.date,
    time: c.event.time,
    place: c.event.place,
    title: c.event.title,
    flavor: c.cake.flavor,
    candles: c.cake.candles,
  };
}

export type TFn = (key: UiKey, extra?: Vars) => string;

/** Builds a translator bound to one config: `T("hudGreeting")`. */
export function makeT(c: PartyConfig): TFn {
  const base = varsOf(c);
  return (key, extra) => fmt(c.ui[key], extra ? { ...base, ...extra } : base);
}

/** "place, date" without dangling commas when a part is empty. */
export function joinNonEmpty(parts: string[], sep = ", "): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(sep);
}
