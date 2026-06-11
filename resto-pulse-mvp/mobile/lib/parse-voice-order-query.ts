import {
  VOICE_CATALOG_PRODUCTS,
  voiceSearchGroupLabel,
} from '@/constants/voice-product-catalog';
import {
  foldTrAscii,
  normalizeTrSpeechText,
  textIncludesTrFolded,
} from '@/lib/turkish-text-fold';

export type VoiceOrderQuery = {
  rawText: string;
  voiceProduct: string | null;
  voiceProductLabel: string | null;
  priceMax: number | null;
  maxDistanceKm: number | null;
  confidence: 'high' | 'partial' | 'low';
  issues: string[];
};

const WORD_ONES: Record<string, number> = {
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
  yirmi: 20,
  otuz: 30,
  kirk: 40,
  kırk: 40,
  elli: 50,
  altmis: 60,
  altmış: 60,
  yetmis: 70,
  yetmiş: 70,
  seksen: 80,
  doksan: 90,
};

function parseSpokenNumber(chunk: string): number | null {
  const cleaned = normalizeTrSpeechText(chunk);
  if (!cleaned) return null;

  const digit = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (digit) {
    const n = Number(digit[1].replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  if (/\byuz\b|\byüz\b/.test(cleaned)) {
    const rest = cleaned.replace(/\byuz\b|\byüz\b/g, '').trim();
    if (!rest) return 100;
    const tail = parseSpokenNumber(rest);
    return tail != null ? 100 + tail : 100;
  }

  if (/\biki yuz\b|\biki yüz\b/.test(cleaned)) return 200;
  if (/\buc yuz\b|\büç yüz\b/.test(cleaned)) return 300;

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 1 && WORD_ONES[tokens[0]] != null) {
    return WORD_ONES[tokens[0]];
  }
  if (tokens.length === 2 && tokens[0] === 'yuz' && WORD_ONES[tokens[1]] != null) {
    return 100 + WORD_ONES[tokens[1]];
  }
  if (tokens.length === 2 && WORD_ONES[tokens[0]] != null && WORD_ONES[tokens[1]] != null) {
    return WORD_ONES[tokens[0]] + WORD_ONES[tokens[1]];
  }

  return null;
}

const SPOKEN_PRICE_PHRASES: Array<{ pattern: RegExp; value: number }> = [
  { pattern: /\biki\s*yuz\b/, value: 200 },
  { pattern: /\buc\s*yuz\b/, value: 300 },
  { pattern: /\bdort\s*yuz\b/, value: 400 },
  { pattern: /\bbes\s*yuz\b/, value: 500 },
  { pattern: /\byuz\s*elli\b/, value: 150 },
  { pattern: /\byuz\s*yirmi\b/, value: 120 },
];

function extractPriceMax(text: string): number | null {
  const folded = foldTrAscii(text);

  for (const row of SPOKEN_PRICE_PHRASES) {
    if (row.pattern.test(folded)) return row.value;
  }

  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(?:tl|lira)(?:\s*(?:ye|ya)\s*kadar)?/,
    /(?:en fazla|maksimum|azami)\s*(\d+(?:[.,]\d+)?)\s*(?:tl|lira)?/,
    /(\d+(?:[.,]\d+)?)\s*liraya\s*kadar/,
    /(yuz\s+elli|iki\s+yuz|uc\s+yuz)\s*(?:tl|lira)?/,
  ];
  for (const pattern of patterns) {
    const match = folded.match(pattern);
    if (!match) continue;
    const parsed = parseSpokenNumber(match[1]);
    if (parsed != null && parsed > 0) return parsed;
  }

  // STT cogu zaman "lira" yazmadan sadece rakam dondurur: "iki 200 lahmacun"
  const bareNumber = folded.match(/\b(\d{2,4})\b/);
  if (bareNumber) {
    const n = Number(bareNumber[1]);
    if (Number.isFinite(n) && n >= 30 && n <= 10_000) return n;
  }

  return null;
}

function extractDistanceKm(foldedText: string): number | null {
  const kmMatch = foldedText.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometre|kilometrede|kilometrelik)/);
  if (kmMatch) {
    const n = Number(kmMatch[1].replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (/\b1\s*km\b|\bbir\s*km\b|\bbir\s*kilometre\b/.test(foldedText)) return 1;
  if (/\b2\s*km\b|\biki\s*km\b|\biki\s*kilometre\b/.test(foldedText)) return 2;
  if (/\byakinimda\b|\byakin\b/.test(foldedText)) return 2;
  return null;
}

type AliasMatch = {
  searchGroup: string;
  slug: string | null;
  label: string;
  alias: string;
};

function buildAliasMatches(): AliasMatch[] {
  const rows: AliasMatch[] = [];
  for (const product of VOICE_CATALOG_PRODUCTS) {
    rows.push({
      searchGroup: product.searchGroup,
      slug: null,
      label: voiceSearchGroupLabel(product.searchGroup),
      alias: product.searchGroup,
    });
    rows.push({
      searchGroup: product.searchGroup,
      slug: product.slug,
      label: product.label,
      alias: product.slug.replace(/-/g, ' '),
    });
    for (const alias of product.aliases) {
      rows.push({
        searchGroup: product.searchGroup,
        slug: product.slug,
        label: product.label,
        alias,
      });
    }
  }
  return rows.sort((a, b) => b.alias.length - a.alias.length);
}

const ALIAS_MATCHES = buildAliasMatches();

export function normalizeVoiceText(value: string): string {
  return normalizeTrSpeechText(value);
}

export function matchVoiceProductDetail(
  text: string,
): { searchGroup: string; slug: string | null; label: string } | null {
  for (const row of ALIAS_MATCHES) {
    if (textIncludesTrFolded(text, row.alias)) {
      return {
        searchGroup: row.searchGroup,
        slug: row.slug,
        label: row.slug ? row.label : voiceSearchGroupLabel(row.searchGroup),
      };
    }
  }
  return null;
}

function extractProduct(text: string): { searchGroup: string; label: string } | null {
  const detail = matchVoiceProductDetail(text);
  if (!detail) return null;
  return { searchGroup: detail.searchGroup, label: voiceSearchGroupLabel(detail.searchGroup) };
}

export function parseVoiceOrderQuery(rawText: string): VoiceOrderQuery {
  const text = normalizeTrSpeechText(rawText);
  const issues: string[] = [];
  const product = extractProduct(text);
  const priceMax = extractPriceMax(text);
  const maxDistanceKm = extractDistanceKm(foldTrAscii(text));

  if (!product) issues.push('Ürün anlaşılamadı (ör. lahmacun, sütlaç, cantık).');
  if (priceMax == null) issues.push('Bütçe tavanı anlaşılamadı (ör. 150 TL).');

  let confidence: VoiceOrderQuery['confidence'] = 'low';
  if (product && priceMax != null) confidence = 'high';
  else if (product || priceMax != null || maxDistanceKm != null) confidence = 'partial';

  return {
    rawText: rawText.trim(),
    voiceProduct: product?.searchGroup ?? null,
    voiceProductLabel: product?.label ?? null,
    priceMax,
    maxDistanceKm,
    confidence,
    issues,
  };
}

export function formatVoiceOrderSummary(query: VoiceOrderQuery): string {
  const parts: string[] = [];
  if (query.priceMax != null && query.voiceProductLabel) {
    parts.push(`${query.priceMax} TL'ye kadar ${query.voiceProductLabel}`);
  } else if (query.voiceProductLabel) {
    parts.push(query.voiceProductLabel);
  } else if (query.priceMax != null) {
    parts.push(`${query.priceMax} TL bütçe`);
  }
  if (query.maxDistanceKm != null) {
    parts.push(`${query.maxDistanceKm} km mesafe`);
  }
  return parts.length ? parts.join(' · ') : 'Komutu netleştirin';
}
