import {
  matchVoiceProductDetail,
  normalizeVoiceText,
  extractPriceMax,
} from '@/lib/parse-voice-order-query';
import { VOICE_CATALOG_PRODUCTS, menuSlugMatchesSearchGroup, voiceSearchGroupLabel, type VoiceCatalogProduct } from '@/constants/voice-product-catalog';
import { foldTrAscii } from '@/lib/turkish-text-fold';
import type { VoiceOrderRestaurantOption } from '@/lib/voice-order-letters';
import type { VoiceMenuMatch } from '@/lib/types';

export type VoiceOrderLineIntent = {
  productSearchGroup: string;
  productSlug: string | null;
  productLabel: string;
  quantity: number;
};

export type VoiceOrderCommand = {
  rawText: string;
  restaurantIndex: number | null;
  restaurantLetter: string | null;
  restaurantName: string | null;
  /** Çoklu ürün satırları — birincil kaynak */
  lines: VoiceOrderLineIntent[];
  /** İlk satır özeti (geriye uyumluluk) */
  quantity: number;
  productSearchGroup: string | null;
  productSlug: string | null;
  productLabel: string | null;
  paymentNote: string;
  priceMaxBudget: number | null;
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseQtyToken(token: string): number | null {
  const n = Number(token);
  if (Number.isFinite(n) && n > 0 && n <= 99) return Math.round(n);
  return WORD_QTY[token.toLowerCase()] ?? null;
}

function extractQuantity(text: string): number | null {
  const digit = text.match(/(\d+)\s*(?:adet|tane|x)/);
  if (digit) {
    const n = Number(digit[1]);
    return n > 0 && n <= 99 ? n : null;
  }
  const bareProduct = text.match(
    /\b(\d+)\s+(?:lahmacun|cantik|cantık|pide|doner|döner|kebap|adana|iskender|tantuni|burger|ayran|kola|kadayif|kadayıf)\b/i,
  );
  if (bareProduct) {
    const n = Number(bareProduct[1]);
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

  const letterHarfi = text.match(/\b([a-z])\s*harfi\b/i);
  if (letterHarfi) {
    const letter = letterHarfi[1].toUpperCase();
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

type SpanHit = { start: number; end: number; intent: VoiceOrderLineIntent };

function spansOverlap(a: SpanHit, b: SpanHit): boolean {
  return a.start < b.end && a.end > b.start;
}

function buildAliasRows(): Array<{ folded: string; product: VoiceCatalogProduct }> {
  const rows: Array<{ folded: string; product: VoiceCatalogProduct }> = [];
  for (const product of VOICE_CATALOG_PRODUCTS) {
    const aliases = new Set([product.slug.replace(/-/g, ' '), ...product.aliases]);
    for (const alias of aliases) {
      const folded = foldTrAscii(alias);
      if (folded.length >= 2) rows.push({ folded, product });
    }
  }
  rows.sort((a, b) => b.folded.length - a.folded.length);
  return rows;
}

const ALIAS_ROWS = buildAliasRows();
const QTY_ALTERNATIVES = ['\\d+', ...Object.keys(WORD_QTY)].join('|');

function extractLineIntents(text: string): VoiceOrderLineIntent[] {
  const normalized = foldTrAscii(normalizeVoiceText(text));
  const hits: SpanHit[] = [];
  const qtyPattern = `(${QTY_ALTERNATIVES})\\s*(?:adet|tane\\s*)?`;

  for (const row of ALIAS_ROWS) {
    const re = new RegExp(`${qtyPattern}\\s*${escapeRegex(row.folded)}`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const qty = parseQtyToken(match[1]) ?? 1;
      const candidate: SpanHit = {
        start: match.index,
        end: match.index + match[0].length,
        intent: {
          productSearchGroup: row.product.searchGroup,
          productSlug: row.product.slug,
          productLabel: row.product.label,
          quantity: qty,
        },
      };
      if (hits.some((hit) => spansOverlap(hit, candidate))) continue;
      hits.push(candidate);
    }
  }

  for (const row of ALIAS_ROWS) {
    const re = new RegExp(`\\b${escapeRegex(row.folded)}\\b`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(normalized)) !== null) {
      const candidate: SpanHit = {
        start: match.index,
        end: match.index + match[0].length,
        intent: {
          productSearchGroup: row.product.searchGroup,
          productSlug: row.product.slug,
          productLabel: row.product.label,
          quantity: 1,
        },
      };
      if (hits.some((hit) => spansOverlap(hit, candidate))) continue;
      hits.push(candidate);
    }
  }

  hits.sort((a, b) => a.start - b.start);

  const merged: VoiceOrderLineIntent[] = [];
  for (const hit of hits) {
    const key = hit.intent.productSlug ?? hit.intent.productSearchGroup;
    const existing = merged.find(
      (row) => (row.productSlug ?? row.productSearchGroup) === key,
    );
    if (existing) {
      existing.quantity += hit.intent.quantity;
      continue;
    }
    merged.push({ ...hit.intent });
  }

  return merged;
}

function buildLines(
  text: string,
  fallbackProductSearchGroup?: string | null,
): VoiceOrderLineIntent[] {
  const fromSpeech = extractLineIntents(text);
  if (fromSpeech.length) return fromSpeech;

  const product = matchVoiceProductDetail(text);
  const quantity = extractQuantity(text) ?? 1;

  if (product?.searchGroup) {
    return [
      {
        productSearchGroup: product.searchGroup,
        productSlug: product.slug,
        productLabel: product.label ?? voiceSearchGroupLabel(product.searchGroup),
        quantity,
      },
    ];
  }

  if (fallbackProductSearchGroup) {
    return [
      {
        productSearchGroup: fallbackProductSearchGroup,
        productSlug: null,
        productLabel: voiceSearchGroupLabel(fallbackProductSearchGroup),
        quantity,
      },
    ];
  }

  return [];
}

export function parseVoiceOrderCommand(
  rawText: string,
  options: VoiceOrderRestaurantOption[],
  fallbackProductSearchGroup?: string | null,
): VoiceOrderCommand {
  const text = normalizeVoiceText(rawText);
  const issues: string[] = [];
  const restaurant = extractRestaurantIndex(text, options);
  const paymentNote = extractPaymentNote(text);
  const priceMaxBudget = extractPriceMax(text);
  const lines = buildLines(text, fallbackProductSearchGroup);
  const first = lines[0];

  if (restaurant.index == null) issues.push('Restoran seçilemedi (ör. B restoranı, B\'den).');
  if (!lines.length) issues.push('Ürün anlaşılamadı (ör. lahmacun, cantık, kola).');
  if (lines.some((row) => row.quantity < 1)) issues.push('Adet geçersiz.');

  let confidence: VoiceOrderCommand['confidence'] = 'low';
  if (restaurant.index != null && lines.length > 0 && lines.every((row) => row.quantity > 0)) {
    confidence = 'high';
  } else if (restaurant.index != null || lines.length > 0) {
    confidence = 'partial';
  }

  return {
    rawText: rawText.trim(),
    restaurantIndex: restaurant.index,
    restaurantLetter: restaurant.letter,
    restaurantName: restaurant.name,
    lines,
    quantity: first?.quantity ?? 1,
    productSearchGroup: first?.productSearchGroup ?? null,
    productSlug: first?.productSlug ?? null,
    productLabel: first?.productLabel ?? null,
    paymentNote,
    priceMaxBudget,
    issues,
    confidence,
  };
}

export function formatVoiceOrderCommandSummary(command: VoiceOrderCommand): string {
  const parts: string[] = [];
  if (command.restaurantLetter && command.restaurantName) {
    parts.push(`${command.restaurantLetter} · ${command.restaurantName}`);
  }
  if (command.lines.length) {
    parts.push(
      command.lines.map((row) => `${row.quantity}× ${row.productLabel}`).join(', '),
    );
  } else if (command.productLabel && command.quantity > 0) {
    parts.push(`${command.quantity}× ${command.productLabel}`);
  }
  if (command.paymentNote) parts.push(command.paymentNote);
  if (command.priceMaxBudget != null) parts.push(`≤ ${command.priceMaxBudget} TL`);
  return parts.length ? parts.join(' · ') : 'Komutu netleştirin';
}

function slugInSearchGroup(slug: string, searchGroup: string): boolean {
  return menuSlugMatchesSearchGroup(slug, searchGroup);
}

function resolveIntentToMenuLine(
  matches: VoiceMenuMatch[],
  intent: VoiceOrderLineIntent,
): { line: VoiceMenuMatch | null; choices: VoiceMenuMatch[]; issue: string | null } {
  if (!matches.length) {
    return { line: null, choices: [], issue: 'Bu restoranda eşleşen menü ürünü yok.' };
  }

  if (intent.productSlug) {
    const exact = matches.find((row) => row.voice_product_slug === intent.productSlug);
    if (exact) return { line: exact, choices: [], issue: null };
  }

  const groupMatches = matches.filter((row) =>
    slugInSearchGroup(row.voice_product_slug, intent.productSearchGroup),
  );
  if (groupMatches.length === 1) return { line: groupMatches[0], choices: [], issue: null };

  const plain = groupMatches.find((row) => row.voice_product_slug === intent.productSearchGroup);
  if (plain) return { line: plain, choices: [], issue: null };

  if (groupMatches.length > 1) {
    return {
      line: null,
      choices: groupMatches,
      issue: `${intent.productLabel} için hangi ürün?`,
    };
  }

  if (matches.length === 1 && matches[0].voice_product_slug === intent.productSlug) {
    return { line: matches[0], choices: [], issue: null };
  }

  return { line: null, choices: [], issue: `${intent.productLabel} menüde bulunamadı.` };
}

export type ResolvedVoiceOrderLine = {
  index: number;
  intent: VoiceOrderLineIntent;
  line: VoiceMenuMatch | null;
  choices: VoiceMenuMatch[];
  issue: string | null;
};

export function resolveVoiceMenuLines(
  matches: VoiceMenuMatch[] | undefined,
  command: VoiceOrderCommand,
): { rows: ResolvedVoiceOrderLine[]; blockingIssue: string | null } {
  const list = matches ?? [];
  const intents = command.lines.length
    ? command.lines
    : command.productSearchGroup
      ? [
          {
            productSearchGroup: command.productSearchGroup,
            productSlug: command.productSlug,
            productLabel: command.productLabel ?? command.productSearchGroup,
            quantity: command.quantity,
          },
        ]
      : [];

  const rows = intents.map((intent, index) => {
    const resolved = resolveIntentToMenuLine(list, intent);
    return { index, intent, ...resolved };
  });

  const pending = rows.find((row) => !row.line && row.choices.length === 0 && row.issue);
  return { rows, blockingIssue: pending?.issue ?? null };
}

/** Tek satır — geriye uyumluluk */
export function resolveVoiceMenuLine(
  matches: VoiceMenuMatch[] | undefined,
  command: VoiceOrderCommand,
): { line: VoiceMenuMatch | null; choices: VoiceMenuMatch[]; issue: string | null } {
  const { rows, blockingIssue } = resolveVoiceMenuLines(matches, command);
  const first = rows[0];
  if (!first) {
    return { line: null, choices: [], issue: blockingIssue ?? 'Sipariş satırı seçilemedi.' };
  }
  return { line: first.line, choices: first.choices, issue: first.issue ?? blockingIssue };
}
