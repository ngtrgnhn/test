import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = await mkdtemp(join(tmpdir(),'hpbd-tests-'));
try {
  const file = join(dir,'regressions.mjs');
  await build({ entryPoints:['tests/regressions.ts'], outfile:file, bundle:true, platform:'node', format:'esm',
    jsx:'automatic', define:{ 'import.meta.env.DEV':'false' },
    banner:{ js:'globalThis.window = { location: { search: "" } };' },
    external:['react','react/jsx-runtime','react-dom/server','zustand'],
  });
  // External packages resolve relative to the bundle; supply a local runner path in the checkout.
  const local = resolve('.test-build.mjs');
  const { copyFile } = await import('node:fs/promises');
  await copyFile(file,local);
  try { const r=spawnSync(process.execPath,['--test',local],{stdio:'inherit'}); process.exitCode=r.status ?? 1; }
  finally { await rm(local,{force:true}); }
} finally { await rm(dir,{recursive:true,force:true}); }
