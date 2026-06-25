/**
 * Sofra static yedek şablonlarını günlük tur sayısına (5) yetecek kadar üretir.
 * Kullanım: node scripts/expand-sofra-static-fallback.mjs [kolay|orta|zor|all]
 */
import { readFileSync, writeFileSync } from 'fs';
import { pathToFileURL } from 'url';

const TARGET = 5;
const zorlukArg = process.argv[2] ?? 'all';
const zorluklar =
  zorlukArg === 'all' ? ['kolay', 'orta', 'zor'] : [zorlukArg];

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const jsonPath = `${root}/data/kelime-sofrasi/static-fallback-puzzles.json`;

const { tryBuildDailySofraPuzzle } = await import(
  pathToFileURL(`${root}/lib/kelime-sofrasi/puzzle.ts`).href
);
const { isSofraPuzzleStructurallyValid } = await import(
  pathToFileURL(`${root}/lib/kelime-sofrasi/puzzle-validate.ts`).href
);

const file = JSON.parse(readFileSync(jsonPath, 'utf8'));

function sig(p) {
  return p.words
    .map((w) => w.kelime)
    .sort()
    .join('|');
}

function genVariants(z) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < 300 && out.length < TARGET; i++) {
    const t0 = Date.now();
    const p = tryBuildDailySofraPuzzle(`static-fb-${z}-${i}`, z, i);
    const ms = Date.now() - t0;
    if (!p || !isSofraPuzzleStructurallyValid(p, z, { skipLexicon: true })) {
      process.stdout.write(`${z} skip i=${i} (${ms}ms)\n`);
      continue;
    }
    const s = sig(p);
    if (seen.has(s)) continue;
    seen.add(s);
    const { id: _id, zorluk: _z, ...rest } = p;
    out.push(rest);
    process.stdout.write(
      `${z} ${out.length}/${TARGET} (${ms}ms) ${p.words.map((w) => w.kelime).join(',')}\n`,
    );
  }
  if (out.length < TARGET) {
    throw new Error(`${z}: yalnizca ${out.length} benzersiz sablon`);
  }
  return out;
}

for (const z of zorluklar) {
  file.variants[z] = genVariants(z);
}

writeFileSync(jsonPath, JSON.stringify(file, null, 2));
process.stdout.write(`Wrote ${jsonPath}\n`);
