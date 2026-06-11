import { matchVoiceProductDetail, normalizeVoiceText } from '@/lib/parse-voice-order-query';
import { VOICE_CATALOG_PRODUCTS } from '@/constants/voice-product-catalog';
import type { VoiceOrderRestaurantOption } from '@/lib/voice-order-letters';
import type { VoiceMenuMatch } from '@/lib/types';

export type VoiceOrderCommand = {
  rawText: string;
  restaurantIndex: number | null;
  restaurantLetter: string | null;
  restaurantName: string | null;
  quantity: number;
  productSearchGroup: string | null;
  productSlug: string | null;
  productLabel: string | null;
  paymentNote: string;
  issues: string[];
  confidence: 'high' | 'partial' | 'low';
};

const WORD_QTY: Record<string, number> = {
  bir: 1,
  iki: 2,
  uc: 3,
  üç: 3,
  dort: 4,
  dört: 4,
  bes: 5,
  beş: 5,
  alti: 6,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
};

function extractQuantity(text: string): number | null {
  const digit = text.match(/(\d+)\s*(?:adet|tane|x)/);
  if (digit) {
    const n = Number(digit[1]);
    return n > 0 && n <= 99 ? n : null;
  }
  for (const [word, qty] of Object.entries(WORD_QTY)) {
    if (new RegExp(`\\b${word}\\s*(?:adet|tane)\\b`).test(text)) return qty;
  }
  return null;
}

function extractPaymentNote(text: string): string {
  if (/kapida\s*kredi|kapıda\s*kredi|kredi\s*kart/i.test(text)) return 'Kapıda kredi kartı';
  if (/kapida\s*nakit|kapıda\s*nakit/i.test(text)) return 'Kapıda nakit';
  if (/kapida|kapıda/i.test(text)) return 'Kapıda ödeme';
  return 'Kapıda ödeme';
}

function extractRestaurantIndex(
  text: string,
  options: VoiceOrderRestaurantOption[],
): { index: number | null; letter: string | null; name: string | null } {
  const letterFromDen = text.match(/\b([a-z])['']?(?:den|dan|ten|tan)\b/i);
  if (letterFromDen) {
    const letter = letterFromDen[1].toUpperCase();
    const hit = options.find((row) => row.letter === letter);
    if (hit) return { index: hit.index, letter: hit.letter, name: hit.name };
  }

  const letterNearRest = text.match(/\b([a-z])\s*restoran/i);
  if (letterNearRest) {
    const letter = letterNearRest[1].toUpperCase();
    const hit = options.find((row) => row.letter === letter);
    if (hit) return { index: hit.index, letter: hit.letter, name: hit.name };
  }

  const loneLetter = text.match(/\b([a-z])\b/i);
  if (loneLetter && options.length <= 4) {
    const letter = loneLetter[1].toUpperCase();
    const hit = options.find((row) => row.letter === letter);
    if (hit) return { index: hit.index, letter: hit.letter, name: hit.name };
  }

  const ordinals: [RegExp, number][] = [
    [/\bbirinci\b/, 0],
    [/\bikinci\b/, 1],
    [/\bucuncu\b|\büçüncü\b/, 2],
    [/\bdorduncu\b|\bdördüncü\b/, 3],
  ];
  for (const [pattern, index] of ordinals) {
    if (pattern.test(text) && options[index]) {
      return { index, letter: options[index].letter, name: options[index].name };
    }
  }

  const normalized = normalizeVoiceText(text);
  for (const option of options) {
    const name = normalizeVoiceText(option.name);
    if (name.length >= 4 && normalized.includes(name)) {
      return { index: option.index, letter: option.letter, name: option.name };
    }
    const firstWord = name.split(' ')[0];
    if (firstWord.length >= 4 && normalized.includes(firstWord)) {
      return { index: option.index, letter: option.letter, name: option.name };
    }
  }

  return { index: null, letter: null, name: null };
}

export function parseVoiceOrderCommand(
  rawText: string,
  options: VoiceOrderRestaurantOption[],
  fallbackProductSearchGroup?: string | null,
): VoiceOrderCommand {
  const text = normalizeVoiceText(rawText);
  const issues: string[] = [];
  const restaurant = extractRestaurantIndex(text, options);
  const product = matchVoiceProductDetail(text);
  const quantity = extractQuantity(text) ?? 1;
  const paymentNote = extractPaymentNote(text);

  const productSearchGroup = product?.searchGroup ?? fallbackProductSearchGroup ?? null;
  const productSlug = product?.slug ?? null;
  const productLabel = product?.label ?? null;

  if (restaurant.index == null) issues.push('Restoran seçilemedi (ör. B restoranı, B\'den).');
  if (!productSearchGroup) issues.push('Ürün anlaşılamadı (ör. lahmacun, cantık).');
  if (quantity < 1) issues.push('Adet geçersiz.');

  let confidence: VoiceOrderCommand['confidence'] = 'low';
  if (restaurant.index != null && productSearchGroup && quantity > 0) confidence = 'high';
  else if (restaurant.index != null || productSearchGroup) confidence = 'partial';

  return {
    rawText: rawText.trim(),
    restaurantIndex: restaurant.index,
    restaurantLetter: restaurant.letter,
    restaurantName: restaurant.name,
    quantity,
    productSearchGroup,
    productSlug,
    productLabel,
    paymentNote,
    issues,
    confidence,
  };
}

export function formatVoiceOrderCommandSummary(command: VoiceOrderCommand): string {
  const parts: string[] = [];
  if (command.restaurantLetter && command.restaurantName) {
    parts.push(`${command.restaurantLetter} · ${command.restaurantName}`);
  }
  if (command.productLabel && command.quantity > 0) {
    parts.push(`${command.quantity}× ${command.productLabel}`);
  }
  if (command.paymentNote) parts.push(command.paymentNote);
  return parts.length ? parts.join(' · ') : 'Komutu netleştirin';
}

function slugInSearchGroup(slug: string, searchGroup: string): boolean {
  return VOICE_CATALOG_PRODUCTS.some((row) => row.slug === slug && row.searchGroup === searchGroup);
}

export function resolveVoiceMenuLine(
  matches: VoiceMenuMatch[] | undefined,
  command: VoiceOrderCommand,
): { line: VoiceMenuMatch | null; choices: VoiceMenuMatch[]; issue: string | null } {
  const list = matches ?? [];
  if (!list.length) {
    return { line: null, choices: [], issue: 'Bu restoranda eşleşen menü ürünü yok.' };
  }

  if (command.productSlug) {
    const exact = list.find((row) => row.voice_product_slug === command.productSlug);
    if (exact) return { line: exact, choices: [], issue: null };
  }

  if (command.productSearchGroup) {
    const groupMatches = list.filter((row) =>
      slugInSearchGroup(row.voice_product_slug, command.productSearchGroup!),
    );
    if (groupMatches.length === 1) return { line: groupMatches[0], choices: [], issue: null };
    const plain = groupMatches.find((row) => row.voice_product_slug === command.productSearchGroup);
    if (plain) return { line: plain, choices: [], issue: null };
    if (groupMatches.length > 1) {
      return { line: null, choices: groupMatches, issue: 'Hangi ürün? Aşağıdan seçin.' };
    }
  }

  if (list.length === 1) return { line: list[0], choices: [], issue: null };
  return { line: null, choices: list, issue: 'Hangi ürün? Aşağıdan seçin.' };
}
