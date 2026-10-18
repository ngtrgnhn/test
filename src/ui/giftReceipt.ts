import type { PartyConfig } from '../config';
export interface GiftReceipt { box: number; reward: number }
export function giftKey(config: PartyConfig) {
  const text = JSON.stringify([config.recipient.name, config.event.date, config.gifts]);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `hpbd:gift:v2:${(hash >>> 0).toString(16)}`;
}
export function readReceipt(key: string, count: number, storage: Pick<Storage,'getItem'> | null): GiftReceipt | null {
  try {
    const r = JSON.parse(storage?.getItem(key) ?? 'null');
    return r && Number.isInteger(r.box) && r.box >= 0 && r.box < Math.min(count, 3)
      && Number.isInteger(r.reward) && r.reward >= 0 && r.reward < count ? r : null;
  } catch { return null; }
}
