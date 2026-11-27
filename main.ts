// HearthLedger entrypoint (Node 22, standard library only).
// Hands the site in: copies app/ and screenshots/ next to this file into the
// output directory and writes dossier.json with the vendored make.fun library.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });

const shotsIn = join(here, 'screenshots');
const shotsOut = join(outDir, 'screenshots');
mkdirSync(shotsOut, { recursive: true });
if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });

// Caps mirror the scorer's: dossier text budget, at most 4 screenshots of
// 256 KiB each, and app/ within 993 entries / 16 MiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('HearthLedger: site + dossier written to', outDir);
