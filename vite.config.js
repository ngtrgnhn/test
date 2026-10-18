import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Snapshot of public/config.json baked into the bundle (offline / fetch-failed fallback). */
function readBundledConfig(root) {
  try {
    const text = fs.readFileSync(path.resolve(root, "public", "config.json"), "utf8");
    JSON.parse(text); // refuse to bake a broken file
    return text;
  } catch {
    return null;
  }
}

/**
 * Dev only: the moment public/config.json is saved, push the new text to every
 * open tab over Vite's websocket. The page updates in place — no reload, and the
 * party/ceremony state is kept.
 */
function partyConfigLive() {
  let file = "";
  let configFile = "";
  return {
    name: "party-config-live",
    apply: "serve",
    enforce: "post",
    /* Vite would otherwise full-reload the page for this file (some module — e.g. Tailwind's
       content scanner — depends on it). An empty list = "I handle it": the client gets the
       new text through the websocket event below and updates in place. */
    handleHotUpdate({ file, modules }) {
      if (path.resolve(file) !== configFile) return;
      if (process.env.PARTY_DEBUG) console.log("[party-config] modules that matched:", modules.map((m) => m.id));
      return [];
    },
    configResolved(cfg) {
      file = path.resolve(cfg.publicDir || path.join(cfg.root, "public"), "config.json");
      configFile = file;
    },
    configureServer(server) {
      server.watcher.add(file);
      const push = (changed) => {
        if (path.resolve(changed) !== file) return;
        try {
          const text = fs.readFileSync(file, "utf8");
          server.ws.send({ type: "custom", event: "party:config", data: { text } });
        } catch {
          /* file mid-save — the 1.5 s poll in the client will catch it */
        }
      };
      server.watcher.on("change", push);
      server.watcher.on("add", push);
    },
  };
}

export default defineConfig({
  // relative base → the built site works from any folder / sub-path
  base: "./",
  plugins: [react(), tailwindcss(), partyConfigLive()],
  define: {
    __BUNDLED_CONFIG__: JSON.stringify(readBundledConfig(process.cwd())),
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
