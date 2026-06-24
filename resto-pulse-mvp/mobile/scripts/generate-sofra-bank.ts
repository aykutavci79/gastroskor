/**
 * Kelime Sofrası — AI destekli bulmaca bankası (500+).
 *
 * Gerekli env (opsiyonel ama önerilir):
 *   GROQ_API_KEY    — kelime/ipucu (birincil) + kalite QA (Llama 3.3)
 *   OPENAI_API_KEY  — kelime/ipucu yedek (gpt-4o-mini)
 *
 * Örnek (Windows SSL: NODE_OPTIONS=--use-system-ca):
 *   $env:NODE_OPTIONS='--use-system-ca'
 *   npx tsx scripts/generate-sofra-bank.ts --count 10 --out data/kelime-sofrasi/sofra-bank.json
 *   npx tsx scripts/generate-sofra-bank.ts --count 500 --out data/kelime-sofrasi/sofra-bank.json
 *   npx tsx scripts/generate-sofra-bank.ts --count 20 --no-ai
 */

(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { EglenceZorluk } from '../constants/eglence-zorluk';
import { SOFRA_GUNLUK_TAMAMLAMA_LIMIT } from '../constants/kelime-sofrasi';
import {
  sofraBankPuzzleKey,
  tryBuildSofraPuzzleAiAssisted,
} from '../lib/kelime-sofrasi/build-ai-puzzle';
import { tryBuildDailySofraPuzzleAsync } from '../lib/kelime-sofrasi/puzzle';

const ZORLUKLAR: EglenceZorluk[] = ['kolay', 'orta', 'zor'];

type BankEntry = {
  bank_index: number;
  zorluk: EglenceZorluk;
  tur: number;
  puzzle_id: string;
  ok: boolean;
  ai_used: boolean;
  qa_score: number | null;
  attempts: number;
  generation_ms: number;
  puzzle: unknown;
};

type BankManifest = {
  version: 1;
  generated_at: string;
  count: number;
  ok_count: number;
  ai_enabled: boolean;
  qa_enabled: boolean;
  entries: BankEntry[];
};

function parseArgs(argv: string[]) {
  let count = 500;
  let out = 'data/kelime-sofrasi/sofra-bank.json';
  let useAi = true;
  let useQa = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count' && argv[i + 1]) count = Math.max(1, Number(argv[++i]));
    else if (a === '--out' && argv[i + 1]) out = argv[++i]!;
    else if (a === '--no-ai') useAi = false;
    else if (a === '--no-qa') useQa = false;
  }
  return { count, out, useAi, useQa };
}

function turForIndex(i: number): number {
  const maxTur =
    typeof SOFRA_GUNLUK_TAMAMLAMA_LIMIT === 'number' && SOFRA_GUNLUK_TAMAMLAMA_LIMIT < 900
      ? SOFRA_GUNLUK_TAMAMLAMA_LIMIT
      : 5;
  return Math.floor(i / ZORLUKLAR.length) % maxTur;
}

async function buildOne(
  bankIndex: number,
  zorluk: EglenceZorluk,
  tur: number,
  useAi: boolean,
  useQa: boolean,
): Promise<BankEntry> {
  const puzzleId = sofraBankPuzzleKey(bankIndex, zorluk, tur);
  const t0 = performance.now();

  if (useAi && (process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim())) {
    const ai = await tryBuildSofraPuzzleAiAssisted(puzzleId, zorluk, { useAi: true, useQa });
    if (ai.puzzle) {
      return {
        bank_index: bankIndex,
        zorluk,
        tur,
        puzzle_id: puzzleId,
        ok: true,
        ai_used: ai.aiUsed,
        qa_score: ai.qa?.score ?? null,
        attempts: ai.attempts,
        generation_ms: Math.round(performance.now() - t0),
        puzzle: ai.puzzle,
      };
    }
  }

  const fallbackGun = `bank-seed-${bankIndex}`;
  const puzzle = await tryBuildDailySofraPuzzleAsync(fallbackGun, zorluk, tur);
  const ok = puzzle != null && puzzle.words.every((w) => !w.id.startsWith('fb-'));
  if (ok && puzzle) {
    puzzle.id = puzzleId;
  }
  return {
    bank_index: bankIndex,
    zorluk,
    tur,
    puzzle_id: puzzleId,
    ok: Boolean(ok && puzzle),
    ai_used: false,
    qa_score: null,
    attempts: 0,
    generation_ms: Math.round(performance.now() - t0),
    puzzle: ok && puzzle ? puzzle : null,
  };
}

async function main() {
  const { count, out, useAi, useQa } = parseArgs(process.argv.slice(2));
  const aiOn =
    useAi && Boolean(process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
  const qaOn = useQa && Boolean(process.env.GROQ_API_KEY?.trim());

  console.error(`[sofra-bank] hedef=${count} ai=${aiOn} qa=${qaOn} out=${out}`);

  const entries: BankEntry[] = [];
  for (let i = 0; i < count; i++) {
    const zorluk = ZORLUKLAR[i % ZORLUKLAR.length]!;
    const tur = turForIndex(i);
    console.error(`[sofra-bank] ${i + 1}/${count} bank-${String(i).padStart(4, '0')} ${zorluk} t${tur}…`);
    const entry = await buildOne(i, zorluk, tur, useAi, useQa);
    entries.push(entry);
    console.error(
      `[sofra-bank]   → ${entry.ok ? 'OK' : 'FAIL'} ai=${entry.ai_used} ${entry.generation_ms}ms`,
    );
  }

  const manifest: BankManifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    count: entries.length,
    ok_count: entries.filter((e) => e.ok).length,
    ai_enabled: aiOn,
    qa_enabled: qaOn,
    entries,
  };

  const abs = resolve(process.cwd(), out);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(manifest, null, 2), 'utf8');

  console.error(
    `[sofra-bank] bitti: ${manifest.ok_count}/${manifest.count} ok → ${abs}`,
  );
}

main().catch((err) => {
  console.error('[sofra-bank] fatal', err);
  process.exit(1);
});
