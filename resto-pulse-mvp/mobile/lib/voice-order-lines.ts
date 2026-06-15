import {
  VOICE_CATALOG_PRODUCTS,
  voiceSearchGroupLabel,
  type VoiceCatalogProduct,
} from '@/constants/voice-product-catalog';
import { foldTrAscii, normalizeTrSpeechText } from '@/lib/turkish-text-fold';

export type VoiceOrderLineIntent = {
  productSearchGroup: string;
  productSlug: string | null;
  productLabel: string;
  quantity: number;
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

/** Miktar + urun satirlari — "3 lahmacun 1 ayran" gibi. */
export function extractVoiceOrderLines(text: string): VoiceOrderLineIntent[] {
  const normalized = foldTrAscii(normalizeTrSpeechText(text));
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
    const existing = merged.find((row) => (row.productSlug ?? row.productSearchGroup) === key);
    if (existing) {
      existing.quantity += hit.intent.quantity;
      continue;
    }
    merged.push({ ...hit.intent });
  }

  return merged;
}

export function voiceLineIntentLabel(intent: VoiceOrderLineIntent): string {
  return intent.productLabel || voiceSearchGroupLabel(intent.productSearchGroup);
}
