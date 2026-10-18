import { useEffect, useRef, useState } from "react";
import { normalizeConfig, PartyConfig } from "./config";

// __BUNDLED_CONFIG__ (config.json at build / dev-start time, or null) is declared in vite-env.d.ts

const DEBUG =
  import.meta.env.DEV || new URLSearchParams(window.location.search).has("debug");

/** Dev: every 1.5 s as a safety net (the Vite watcher pushes instantly). Prod: every 5 s. */
const POLL_MS = import.meta.env.DEV ? 1500 : 5000;

function configUrl(): string {
  // BASE_URL is "./" (relative) so the site works from any sub-path
  // (GitHub Pages, Vercel preview folders, …) — never a hard-coded "/".
  const base = import.meta.env.BASE_URL || "./";
  return new URL(`${base}config.json`, document.baseURI).href;
}

export type ConfigSource = "network" | "bundled";

export interface LiveConfig {
  config: PartyConfig | null;
  /** where the current config came from */
  source: ConfigSource | null;
  /** last JSON/parse/network problem (the previous good config stays on screen) */
  error: string | null;
  /** increments every time the *content* actually changed (not on identical polls) */
  revision: number;
}

/**
 * Loads `config.json` and keeps it live:
 *  - first load: network → bundled snapshot → built-in defaults (never a blank page)
 *  - dev server: the Vite plugin pushes the new file over HMR the moment it is saved
 *  - production: re-fetches every few seconds, on tab focus and when the network returns
 *  - only a *changed* file re-renders anything; a syntax error keeps the last good content
 */
export function useLiveConfig(): LiveConfig {
  const [state, setState] = useState<LiveConfig>({
    config: null,
    source: null,
    error: null,
    revision: 0,
  });
  const lastText = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    let inflight = false;

    const apply = (text: string, source: ConfigSource) => {
      if (!alive) return false;
      if (text === lastText.current) { setState(s => s.error ? { ...s, error: null } : s); return true; } // nothing changed → nothing re-renders
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        const msg = `config.json sai cú pháp: ${(e as Error).message}`;
        console.warn("❌", msg);
        setState((s) => (s.error === msg ? s : { ...s, error: msg }));
        return false;
      }
      lastText.current = text;
      const config = normalizeConfig(parsed);
      if (DEBUG) console.info("✅ config.json applied", { source, config });
      setState((s) => ({ config, source, error: null, revision: s.revision + 1 }));
      return true;
    };

    const fetchNow = async (): Promise<boolean> => {
      if (inflight) return true;
      inflight = true;
      try {
        const res = await fetch(`${configUrl()}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        // an SPA host may answer a missing file with index.html (200) — treat as failure
        if (/^\s*</.test(text)) throw new Error("config.json không tồn tại (nhận về HTML)");
        return apply(text, "network");
      } catch (e) {
        if (DEBUG) console.warn("config.json fetch failed:", (e as Error).message);
        return false;
      } finally {
        inflight = false;
      }
    };

    // ---- first load -------------------------------------------------------
    fetchNow().then((ok) => {
      if (ok || !alive || lastText.current !== null) return;
      // network failed: use the snapshot baked into the bundle, else defaults
      if (typeof __BUNDLED_CONFIG__ === "string" && __BUNDLED_CONFIG__) {
        console.warn("⚠️ Không tải được config.json — dùng bản đóng gói sẵn trong build.");
        apply(__BUNDLED_CONFIG__, "bundled");
      } else {
        console.warn("⚠️ Không tải được config.json — dùng cấu hình mặc định.");
        apply("{}", "bundled");
      }
    });

    // ---- live updates -----------------------------------------------------
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchNow();
    }, POLL_MS);
    const kick = () => {
      if (document.visibilityState === "visible") void fetchNow();
    };
    window.addEventListener("focus", kick);
    window.addEventListener("online", kick);
    document.addEventListener("visibilitychange", kick);

    // dev server push (instant)
    const hot = import.meta.hot;
    const onPush = (data: { text?: string }) => {
      if (typeof data?.text === "string") apply(data.text, "network");
    };
    hot?.on("party:config", onPush);

    return () => {
      alive = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", kick);
      window.removeEventListener("online", kick);
      document.removeEventListener("visibilitychange", kick);
      hot?.off?.("party:config", onPush);
    };
  }, []);

  return state;
}
