/**
 * Kelime Sofrası generator kısıt testi.
 * Çalıştır: npx tsx scripts/test-sofra-generator.ts
 */

import { SOFRA_KELIME_HEDEF } from '../constants/eglence-zorluk';
import type { EglenceZorluk } from '../constants/eglence-zorluk';
import { packCrosswordFromCandidates, type PackStats } from '../lib/kelime-sofrasi/crossword-pack';
import { extractGridRuns, type GridMap } from '../lib/kelime-sofrasi/grid-runs';
import { cantadanKelimeAdaylari } from '../lib/kelime-sofrasi/letter-bag';
import { havuzKelimeFiltre, havuzZorlukFiltre } from '../lib/kelime-sofrasi/havuz';
import { buildDailySofraPuzzle } from '../lib/kelime-sofrasi/puzzle';
import { tdkLexicon } from '../lib/kelime-sofrasi/tdk-lexicon';
import { sofraKelimeBuyuk } from '../lib/kelime-sofrasi/turkce-harf';
import { mulberry32, seedFromString } from '../lib/mini-sudoku/rng';
import {
  SOFRA_MIN_KELIME_UZUNLUGU,
  SOFRA_WHEEL_MAX,
  SOFRA_WHEEL_MIN,
} from '../constants/kelime-sofrasi';
import type { SofraPlacedWord } from '../lib/kelime-sofrasi/types';

const ZORLUKLAR: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

function shiftDate(base: string, deltaDays: number): string {
  const [y, m, d] = base.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function placedToGrid(words: SofraPlacedWord[]): GridMap {
  const grid: GridMap = new Map();
  for (const w of words) {
    const norm = sofraKelimeBuyuk(w.kelime);
    for (let i = 0; i < norm.length; i++) {
      const row = w.direction === 'h' ? w.row : w.row + i;
      const col = w.direction === 'h' ? w.col + i : w.col;
      const k = `${row},${col}`;
      const existing = grid.get(k);
      if (existing) {
        if (!existing.wordIds.includes(w.id)) existing.wordIds.push(w.id);
      } else {
        grid.set(k, { letter: norm[i]!, wordIds: [w.id] });
      }
    }
  }
  return grid;
}

function validateRuns(words: SofraPlacedWord[]): { ok: boolean; invalid: string[] } {
  const lexicon = tdkLexicon();
  const runs = extractGridRuns(placedToGrid(words));
  const invalid = runs.filter((r) => r.length >= 2 && !lexicon.has(r));
  return { ok: invalid.length === 0, invalid };
}

function isFallback(puzzle: ReturnType<typeof buildDailySofraPuzzle>, zorluk: EglenceZorluk): boolean {
  const hedef = SOFRA_KELIME_HEDEF[zorluk];
  return puzzle.words.length !== hedef || puzzle.words.some((w) => w.id.startsWith('fb-'));
}

function wheelFromSeed(seed: string, rand: () => number): string[] {
  const letters = [...sofraKelimeBuyuk(seed)];
  const order = letters.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order.map((i) => letters[i]!);
}

function main() {
  const lexiconSize = tdkLexicon().size;
  console.log(`TDK lexicon: ${lexiconSize} kelime\n`);

  const baseDate = '2026-06-19';
  const dates = Array.from({ length: 15 }, (_, i) => shiftDate(baseDate, -i));

  type Row = {
    gunId: string;
    zorluk: EglenceZorluk;
    ok: boolean;
    ms: number;
    words: number;
    hedef: number;
    fallback: boolean;
    lexiconOk: boolean;
    invalidRuns: string[];
    stats?: PackStats;
  };

  const rows: Row[] = [];
  const stalls: string[] = [];

  for (const gunId of dates) {
    for (const zorluk of ZORLUKLAR) {
      const t0 = performance.now();
      const puzzle = buildDailySofraPuzzle(gunId, zorluk);
      const ms = performance.now() - t0;
      const hedef = SOFRA_KELIME_HEDEF[zorluk];
      const fallback = isFallback(puzzle, zorluk);
      const { ok: lexiconOk, invalid } = validateRuns(puzzle.words);
      const ok = !fallback && lexiconOk && puzzle.words.length === hedef;

      rows.push({
        gunId,
        zorluk,
        ok,
        ms,
        words: puzzle.words.length,
        hedef,
        fallback,
        lexiconOk,
        invalidRuns: invalid,
      });

      if (!ok) {
        stalls.push(
          `${gunId}/${zorluk}: fallback=${fallback} words=${puzzle.words.length}/${hedef} invalidRuns=${invalid.join(',') || '-'}`,
        );
      }
    }
  }

  const okCount = rows.filter((r) => r.ok).length;
  const avgMs = rows.reduce((s, r) => s + r.ms, 0) / rows.length;
  const maxMs = Math.max(...rows.map((r) => r.ms));

  console.log('=== Günlük bulmaca üretim raporu (15 gün × 3 zorluk = 45) ===');
  console.log(`Başarılı: ${okCount}/45`);
  console.log(`Ortalama süre: ${avgMs.toFixed(0)} ms`);
  console.log(`Maks süre: ${maxMs.toFixed(0)} ms`);
  console.log(`Fallback kullanımı: ${rows.filter((r) => r.fallback).length}`);

  if (stalls.length) {
    console.log('\n--- Başarısız / tıkanan ---');
    for (const s of stalls) console.log(s);
  } else {
    console.log('\nTüm kombinasyonlar hedef kelime sayısıyla tamamlandı.');
  }

  // Doğrudan pack istatistikleri (buildDaily ile aynı seed)
  console.log('\n=== Pack istatistik örneği (2026-06-19 / orta) ===');
  const gunId = '2026-06-19';
  const zorluk: EglenceZorluk = 'orta';
  const puzzleId = `${gunId}:${zorluk}`;
  const pool = havuzZorlukFiltre(
    havuzKelimeFiltre(SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_WHEEL_MAX),
    zorluk,
  );
  const seedWords = pool.filter(
    (w) => w.kelime.length >= SOFRA_WHEEL_MIN && w.kelime.length <= SOFRA_WHEEL_MAX,
  );
  const rand = mulberry32(seedFromString(`gastro-kelime-sofrasi:${puzzleId}`));
  const start = seedFromString(`${puzzleId}:anchor`) % seedWords.length;
  const anchor = seedWords[start]!;
  const wheel = wheelFromSeed(anchor.kelime, rand);
  const candidates = cantadanKelimeAdaylari(wheel, pool);
  const stats: PackStats = { lexiconRejections: 0, placementsTried: 0, backtracks: 0 };
  const hedef = SOFRA_KELIME_HEDEF[zorluk];
  const placed = packCrosswordFromCandidates(candidates, rand, hedef, hedef, stats);
  console.log(`anchor: ${anchor.kelime} | candidates: ${candidates.length}`);
  console.log(`placed: ${placed?.length ?? 0}/${hedef}`);
  console.log(`lexiconRejections: ${stats.lexiconRejections}`);
  console.log(`placementsTried: ${stats.placementsTried}`);
  console.log(`backtracks: ${stats.backtracks}`);
  if (stats.stallReason) console.log(`stallReason: ${stats.stallReason}`);
  if (placed) {
    const v = validateRuns(placed);
    console.log(`post-check runs valid: ${v.ok}`);
  }
}

main();
