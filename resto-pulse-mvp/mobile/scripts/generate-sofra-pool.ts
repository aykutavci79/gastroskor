/**
 * Kelime Sofrası günlük bulmaca havuzu üretici (cron / backend subprocess).
 * Çalıştır: npx tsx scripts/generate-sofra-pool.ts --gun-id 2026-06-20
 * Çıktı: stdout JSON array
 */

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '../constants/kelime-sofrasi';
import type { EglenceZorluk } from '../constants/eglence-zorluk';
import { SOFRA_KELIME_HEDEF } from '../constants/eglence-zorluk';
import { validateSofraCrossword } from '../lib/kelime-sofrasi/grid-runs';
import { sofraPuzzleKey } from '../constants/eglence-zorluk';
import { tryBuildDailySofraPuzzle } from '../lib/kelime-sofrasi/puzzle';
import { tdkLexicon } from '../lib/kelime-sofrasi/tdk-lexicon';
import { activePuzzleId } from '../lib/mini-sudoku/schedule';
import { SOFRA_MIN_KELIME_UZUNLUGU } from '../constants/kelime-sofrasi';

const ZORLUKLAR: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

function parseGunId(argv: string[]): string {
  const idx = argv.indexOf('--gun-id');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]!;
  return activePuzzleId();
}

function turSayisi(): number {
  return typeof SOFRA_GUNLUK_TAMAMLAMA_LIMIT === 'number' && SOFRA_GUNLUK_TAMAMLAMA_LIMIT < 900
    ? SOFRA_GUNLUK_TAMAMLAMA_LIMIT
    : 5;
}

function isValid(puzzle: NonNullable<ReturnType<typeof tryBuildDailySofraPuzzle>>, zorluk: EglenceZorluk): boolean {
  const hedef = SOFRA_KELIME_HEDEF[zorluk];
  if (puzzle.words.length !== hedef) return false;
  if (puzzle.words.some((w) => w.id.startsWith('fb-'))) return false;
  return validateSofraCrossword(puzzle.words, tdkLexicon(), SOFRA_MIN_KELIME_UZUNLUGU).ok;
}

function main() {
  const gunId = parseGunId(process.argv.slice(2));
  const turlar = turSayisi();
  const out: Array<Record<string, unknown>> = [];

  for (const zorluk of ZORLUKLAR) {
    for (let tur = 0; tur < turlar; tur++) {
      const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
      const t0 = performance.now();
      const puzzle = tryBuildDailySofraPuzzle(gunId, zorluk, tur);
      const generation_ms = Math.round(performance.now() - t0);
      const ok = puzzle != null && puzzle.id === puzzleId && isValid(puzzle, zorluk);
      out.push({
        gun_id: gunId,
        zorluk,
        tur,
        puzzle_id: puzzleId,
        ok,
        generation_ms,
        puzzle: ok ? puzzle : null,
      });
    }
  }

  process.stdout.write(JSON.stringify(out));
}

main();
