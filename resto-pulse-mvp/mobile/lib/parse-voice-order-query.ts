import {
  VOICE_CATALOG_PRODUCTS,
  voiceSearchGroupLabel,
} from '@/constants/voice-product-catalog';
import type { VoiceOrderLineIntent } from '@/lib/voice-order-lines';
import { extractVoiceOrderLines } from '@/lib/voice-order-lines';
import {
  extractPriceMax,
  isVoiceBudgetCeiling,
} from '@/lib/voice-order-price';
import {
  foldTrAscii,
  normalizeTrSpeechText,
  textIncludesTrFolded,
} from '@/lib/turkish-text-fold';

export type VoiceOrderQuery = {
  rawText: string;
  voiceProduct: string | null;
  voiceProductLabel: string | null;
  /** Tek urun karsilastirma aramasi — or. 150 TL lahmacun */
  priceMax: number | null;
  /** Sepet toplam tavanı — or. 350 TL geçmesin */
  priceMaxBudget: number | null;
  /** Coklu urun / adet / bütçe — akıllı sepet akisi */
  isCartOrder: boolean;
  cartLines: VoiceOrderLineIntent[];
  maxDistanceKm: number | null;
  confidence: 'high' | 'partial' | 'low';
  issues: string[];
};

export { extractPriceMax, isVoiceBudgetCeiling } from '@/lib/voice-order-price';

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

function stripPriceNoise(text: string): string {
  return normalizeTrSpeechText(text)
    .replace(/\d+(?:[.,]\d+)?\s*liralik/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*lik/gi, ' ')
    .replace(/\d+(?:[.,]\d+)?\s*(?:tl|lira)(?:\s*(?:ye|ya)\s*kadar)?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractProduct(text: string): { searchGroup: string; label: string } | null {
  const detail = matchVoiceProductDetail(stripPriceNoise(text) || text);
  if (!detail) return null;
  return { searchGroup: detail.searchGroup, label: voiceSearchGroupLabel(detail.searchGroup) };
}

function detectCartOrder(
  text: string,
  cartLines: VoiceOrderLineIntent[],
  priceMaxBudget: number | null,
): boolean {
  if (cartLines.length > 1) return true;
  if (cartLines.length === 1 && cartLines[0].quantity > 1) return true;
  if (cartLines.length >= 1 && isVoiceBudgetCeiling(text) && priceMaxBudget != null) return true;
  return false;
}

export function parseVoiceOrderQuery(rawText: string): VoiceOrderQuery {
  const text = normalizeTrSpeechText(rawText);
  const issues: string[] = [];
  const cartLines = extractVoiceOrderLines(text);
  const budgetCeiling = isVoiceBudgetCeiling(text);
  const priceMaxBudget = budgetCeiling ? extractPriceMax(text) : null;
  const isCartOrder = detectCartOrder(text, cartLines, priceMaxBudget);

  const product = extractProduct(text);
  const primaryLine = cartLines[0];
  const voiceProduct =
    (isCartOrder ? primaryLine?.productSearchGroup : product?.searchGroup) ?? product?.searchGroup ?? null;
  const voiceProductLabel =
    (isCartOrder && primaryLine
      ? primaryLine.productLabel
      : product?.label) ?? (voiceProduct ? voiceSearchGroupLabel(voiceProduct) : null);

  const priceMax = isCartOrder ? null : extractPriceMax(text);
  const maxDistanceKm = extractDistanceKm(foldTrAscii(text));

  if (!isCartOrder && !product) {
    issues.push('Ürün anlaşılamadı (ör. lahmacun, sütlaç, cantık).');
  }
  if (isCartOrder && !cartLines.length) {
    issues.push('Sepet anlaşılamadı (ör. 3 lahmacun 1 ayran).');
  }

  let confidence: VoiceOrderQuery['confidence'] = 'low';
  if ((isCartOrder && cartLines.length > 0) || product) confidence = 'high';
  else if (priceMax != null || priceMaxBudget != null || maxDistanceKm != null) confidence = 'partial';

  return {
    rawText: rawText.trim(),
    voiceProduct,
    voiceProductLabel,
    priceMax,
    priceMaxBudget,
    isCartOrder,
    cartLines,
    maxDistanceKm,
    confidence,
    issues,
  };
}

export function formatVoiceOrderSummary(query: VoiceOrderQuery): string {
  const parts: string[] = [];

  if (query.isCartOrder && query.cartLines.length) {
    parts.push(query.cartLines.map((row) => `${row.quantity}× ${row.productLabel}`).join(', '));
    if (query.priceMaxBudget != null) {
      parts.push(`toplam en fazla ${query.priceMaxBudget} TL`);
    }
  } else if (query.priceMax != null && query.voiceProductLabel) {
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

/** Ürün fiyatını kartta göster — lahmacun vb. Karşılaştırma araması. */
export function shouldShowVoiceProductPrice(query: VoiceOrderQuery | null | undefined): boolean {
  if (!query?.voiceProduct || query.isCartOrder) return false;
  const folded = foldTrAscii(query.rawText);
  // Puan / sıralama odaklı: "kebap 4.5 yıldız restoranları sırala" → fiyat satırı yok
  if (/\b(?:yildiz|puan|puani|siral|sirala|en iyi|en yuksek)\b/.test(folded)) {
    return false;
  }
  if (
    /\b(?:4[,.]?5|5[,.]?0|\d)\s*(?:yildiz|puan)\b/.test(folded) ||
    /\b(?:dort|bes)\s*(?:bucuk|nokta)\s*(?:yildiz|puan)\b/.test(folded)
  ) {
    return false;
  }
  return true;
}
