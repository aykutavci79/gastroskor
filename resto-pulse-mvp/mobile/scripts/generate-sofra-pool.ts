/**
 * Kelime Sofrası günlük bulmaca havuzu üretici (cron / backend subprocess).
 * Çalıştır: npx tsx scripts/generate-sofra-pool.ts --gun-id 2026-06-20
 * Çıktı: stdout JSON array
 */

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '../constants/kelime-sofrasi';
import type { EglenceZorluk } from '../constants/eglence-zorluk';
import { sofraKelimeSayisiGecerli } from '../constants/eglence-zorluk';
import { isSofraPuzzleStructurallyValid } from '../lib/kelime-sofrasi/puzzle-validate';
import { sofraPuzzleKey } from '../constants/eglence-zorluk';
import { tryBuildDailySofraPuzzle } from '../lib/kelime-sofrasi/puzzle';
import { tryBuildSofraPuzzleAiAssisted } from '../lib/kelime-sofrasi/build-ai-puzzle';
import { activePuzzleId } from '../lib/mini-sudoku/schedule';

const ZORLUKLAR: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

function parseFlags(argv: string[]): { gunId: string; useAi: boolean; useQa: boolean } {
  const useAi = !argv.includes('--no-ai');
  const useQa = !argv.includes('--no-qa');
  const idx = argv.indexOf('--gun-id');
  const gunId = idx >= 0 && argv[idx + 1] ? argv[idx + 1]! : activePuzzleId();
  return { gunId, useAi, useQa };
}

function turSayisi(): number {
  return typeof SOFRA_GUNLUK_TAMAMLAMA_LIMIT === 'number' && SOFRA_GUNLUK_TAMAMLAMA_LIMIT < 900
    ? SOFRA_GUNLUK_TAMAMLAMA_LIMIT
    : 5;
}

function isValid(puzzle: NonNullable<ReturnType<typeof tryBuildDailySofraPuzzle>>, zorluk: EglenceZorluk): boolean {
  if (!sofraKelimeSayisiGecerli(zorluk, puzzle.words.length)) return false;
  if (puzzle.words.some((w) => w.id.startsWith('fb-'))) return false;
  if (puzzle.id.includes(':fb-')) return false;
  return isSofraPuzzleStructurallyValid(puzzle, zorluk);
}

async function main() {
  const argv = process.argv.slice(2);
  const { gunId, useAi, useQa } = parseFlags(argv);
  const turlar = turSayisi();
  const out: Array<Record<string, unknown>> = [];
  const aiOn =
    useAi && Boolean(process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
  const total = ZORLUKLAR.length * turlar;
  let done = 0;

  console.error(`[sofra-pool] gun_id=${gunId} slots=${total} ai=${aiOn} qa=${useQa && aiOn}`);

  for (const zorluk of ZORLUKLAR) {
    for (let tur = 0; tur < turlar; tur++) {
      done += 1;
      const puzzleId = sofraPuzzleKey(gunId, zorluk, tur);
      console.error(`[sofra-pool] ${done}/${total} ${zorluk} tur ${tur}…`);
      const t0 = performance.now();
      let puzzle = null as ReturnType<typeof tryBuildDailySofraPuzzle> | null;
      let aiUsed = false;

      if (aiOn) {
        try {
          const built = await tryBuildSofraPuzzleAiAssisted(puzzleId, zorluk, {
            useAi: true,
            useQa,
          });
          if (built.puzzle) {
            puzzle = built.puzzle;
            aiUsed = built.aiUsed;
          }
        } catch (err) {
          console.error(
            `[sofra-pool]   AI hata (${zorluk} t${tur}): ${err instanceof Error ? err.message : err}`,
          );
        }
      }
      if (!puzzle) {
        puzzle = tryBuildDailySofraPuzzle(gunId, zorluk, tur);
      }

      const generation_ms = Math.round(performance.now() - t0);
      const ok = puzzle != null && puzzle.id === puzzleId && isValid(puzzle, zorluk);
      console.error(
        `[sofra-pool]   → ${ok ? 'OK' : 'FAIL'} ai=${aiUsed} ${generation_ms}ms`,
      );
      out.push({
        gun_id: gunId,
        zorluk,
        tur,
        puzzle_id: puzzleId,
        ok,
        ai_used: aiUsed,
        generation_ms,
        puzzle: ok ? puzzle : null,
      });
    }
  }

  process.stdout.write(JSON.stringify(out));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
