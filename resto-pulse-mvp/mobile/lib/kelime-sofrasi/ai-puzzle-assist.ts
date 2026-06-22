/**
 * Kelime Sofrası — offline batch (Node script).
 * Groq: kelime/ipucu öner (birincil) · OpenAI: yedek · Groq: kalite QA
 * Yapısal doğruluk: validateSofraCrossword (AI değil).
 */

import type { EglenceZorluk } from '@/constants/eglence-zorluk';
import { SOFRA_MIN_KELIME_UZUNLUGU, SOFRA_WHEEL_MAX, SOFRA_WHEEL_MIN } from '@/constants/kelime-sofrasi';
import { kelimeCantayaSigar, harfCantasi } from '@/lib/kelime-sofrasi/letter-bag';
import { tdkLexicon } from '@/lib/kelime-sofrasi/tdk-lexicon';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';
import type { SofraPlacedWord, SofraPuzzle } from '@/lib/kelime-sofrasi/types';

export type AiWheelSuggestion = {
  wheelSeed: string;
  targetWords: string[];
  hints: Record<string, string>;
  bonusWords: string[];
};

export type AiQaVerdict = {
  ok: boolean;
  score: number;
  issues: string[];
};

const OPENAI_MODEL = 'gpt-4o-mini';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function postChatJson<T>(
  url: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<T | null> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error(`[sofra-ai] HTTP ${res.status} ${url}: ${err.slice(0, 200)}`);
    return null;
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error('[sofra-ai] JSON parse fail');
    return null;
  }
}

function wheelBag(wheel: string[]) {
  return harfCantasi(wheel.map((c) => sofraKelimeBuyuk(c)));
}

function wordOnWheel(word: string, wheel: string[]): boolean {
  return kelimeCantayaSigar(sofraKelimeBuyuk(word), wheelBag(wheel));
}

function inTdk(word: string): boolean {
  return tdkLexicon().has(sofraKelimeBuyuk(word));
}

function aiMetin(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** AI çıktısını wheel + TDK ile süz. */
export function sanitizeAiSuggestion(
  raw: AiWheelSuggestion,
  wheel: string[],
  kelimeHedef: number,
): AiWheelSuggestion {
  const seed = sofraKelimeBuyuk(aiMetin(raw.wheelSeed));
  const bag = wheelBag(wheel);
  const seedOk =
    seed.length >= SOFRA_WHEEL_MIN &&
    seed.length <= SOFRA_WHEEL_MAX &&
    [...seed].every((ch) => {
      const left = bag.get(ch) ?? 0;
      if (left <= 0) return false;
      bag.set(ch, left - 1);
      return true;
    });

  const targetWords: string[] = [];
  const seen = new Set<string>();
  for (const w of raw.targetWords ?? []) {
    const norm = sofraKelimeBuyuk(aiMetin(w));
    if (norm.length < SOFRA_MIN_KELIME_UZUNLUGU) continue;
    if (!wordOnWheel(norm, wheel) || !inTdk(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    targetWords.push(norm);
    if (targetWords.length >= kelimeHedef + 2) break;
  }

  const hints: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.hints ?? {})) {
    const norm = sofraKelimeBuyuk(aiMetin(k));
    const hint = aiMetin(v).trim();
    if (targetWords.includes(norm) && hint) {
      hints[norm] = hint.slice(0, 120);
    }
  }

  const bonusWords: string[] = [];
  for (const w of raw.bonusWords ?? []) {
    const norm = sofraKelimeBuyuk(aiMetin(w));
    if (norm.length < SOFRA_MIN_KELIME_UZUNLUGU) continue;
    if (!wordOnWheel(norm, wheel) || !inTdk(norm)) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    bonusWords.push(norm);
    if (bonusWords.length >= 12) break;
  }

  return {
    wheelSeed: seedOk ? seed : sofraKelimeBuyuk(wheel.join('')),
    targetWords,
    hints,
    bonusWords,
  };
}

function buildSuggestPrompt(wheel: string[], zorluk: EglenceZorluk, kelimeHedef: number) {
  const letters = wheel.map((c) => sofraKelimeBuyuk(c)).join(', ');
  const system = `Sen Kelime Sofrası bulmaca editörüsün. Yalnızca geçerli JSON döndür.
Kurallar:
- Türkçe kelimeler; İ/i ayrımına dikkat (sofra, İstanbul vb.)
- wheelSeed: ${SOFRA_WHEEL_MIN}-${SOFRA_WHEEL_MAX} harf, verilen harflerin permütasyonu
- targetWords: tam ${kelimeHedef} adet hedef kelime; çark harflerinden oluşmalı; yemek/mutfak/günlük hayat
- Aynı eksende önek/sonek çifti verme (GEL ve GELİN birlikte olmasın)
- hints: her hedef kelime için kısa ipucu (max 80 karakter)
- bonusWords: ızgarada olmayan ekstra kelimeler (çark harflerinden)`;

  const user = `Zorluk: ${zorluk}
Hedef kelime sayısı: ${kelimeHedef}
Çark harfleri: ${letters}

JSON şeması:
{"wheelSeed":"...","targetWords":["..."],"hints":{"KELIME":"ipucu"},"bonusWords":["..."]}`;

  return { system, user };
}

async function suggestWordsFromProvider(
  url: string,
  apiKey: string,
  model: string,
  wheel: string[],
  zorluk: EglenceZorluk,
  kelimeHedef: number,
): Promise<AiWheelSuggestion | null> {
  const { system, user } = buildSuggestPrompt(wheel, zorluk, kelimeHedef);
  const raw = await postChatJson<AiWheelSuggestion>(url, apiKey, model, system, user);
  if (!raw) return null;
  return sanitizeAiSuggestion(raw, wheel, kelimeHedef);
}

/** Groq birincil — ucuz/hızlı batch üretim. */
export async function suggestWordsWithGroq(
  wheel: string[],
  zorluk: EglenceZorluk,
  kelimeHedef: number,
): Promise<AiWheelSuggestion | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  return suggestWordsFromProvider(
    'https://api.groq.com/openai/v1/chat/completions',
    key,
    GROQ_MODEL,
    wheel,
    zorluk,
    kelimeHedef,
  );
}

/** OpenAI yedek — Groq rate-limit veya hata durumunda. */
export async function suggestWordsWithOpenAi(
  wheel: string[],
  zorluk: EglenceZorluk,
  kelimeHedef: number,
): Promise<AiWheelSuggestion | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return suggestWordsFromProvider(
    'https://api.openai.com/v1/chat/completions',
    key,
    OPENAI_MODEL,
    wheel,
    zorluk,
    kelimeHedef,
  );
}

/** Groq → OpenAI fallback. */
export async function suggestWordsWithAi(
  wheel: string[],
  zorluk: EglenceZorluk,
  kelimeHedef: number,
): Promise<{ suggestion: AiWheelSuggestion | null; provider: 'groq' | 'openai' | null }> {
  const groq = await suggestWordsWithGroq(wheel, zorluk, kelimeHedef);
  if (groq) return { suggestion: groq, provider: 'groq' };
  const openai = await suggestWordsWithOpenAi(wheel, zorluk, kelimeHedef);
  if (openai) return { suggestion: openai, provider: 'openai' };
  return { suggestion: null, provider: null };
}

export async function qaPuzzleWithGroq(puzzle: SofraPuzzle): Promise<AiQaVerdict | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;

  const words = puzzle.words.map((w) => w.kelime).join(', ');
  const system = `Kelime Sofrası kalite denetçisisin. Yapısal kurallar kodda; sen sadece eğlence/kafa karışıklığı bak.
JSON: {"ok":true/false,"score":1-10,"issues":["..."]}
Red flags: önek/sonek çiftleri (GEL+GELİN), anlamsız ipucu, aşırı nadir kelime, bonus hedefle aynı.`;

  const user = `Zorluk: ${puzzle.zorluk}
Wheel: ${puzzle.wheel.join('')}
Hedef kelimeler: ${words}
Bonus sayısı: ${puzzle.bonusKelimeler.length}`;

  const raw = await postChatJson<AiQaVerdict>(
    'https://api.groq.com/openai/v1/chat/completions',
    key,
    GROQ_MODEL,
    system,
    user,
  );
  if (!raw) return null;
  return {
    ok: Boolean(raw.ok),
    score: Number(raw.score) || 0,
    issues: Array.isArray(raw.issues) ? raw.issues.map(String) : [],
  };
}

export function applyAiHintsToWords(
  words: SofraPlacedWord[],
  hints: Record<string, string>,
): SofraPlacedWord[] {
  return words.map((w) => {
    const hint = hints[sofraKelimeBuyuk(w.kelime)];
    if (!hint) return w;
    return { ...w, ipucu: w.ipucu?.trim() ? w.ipucu : hint };
  });
}
