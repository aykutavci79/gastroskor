import type { RestaurantListItem } from '@/lib/types';

const PATTERNS: RegExp[] = [
  /(?:tüm\s+)?(?:menü(?:de|den)?|ürün(?:ler(?:de|den)?)?)\s*(?:de|den)?\s*%?\s*(\d{1,2})\s*%?/i,
  /%(\d{1,2})\s*(?:tüm\s+)?(?:menü|indirim)/i,
  /(\d{1,2})\s*%\s*(?:indirim|tüm|menü)/i,
  /yüzde\s*(\d{1,2})/i,
  /%(\d{1,2})\b/,
  /(\d{1,2})\s*%/,
];

function parseDiscountFromText(text: string | null | undefined): number | null {
  const normalized = text?.trim();
  if (!normalized) return null;
  for (const pattern of PATTERNS) {
    const match = normalized.match(pattern);
    if (!match?.[1]) continue;
    const percent = Number.parseInt(match[1], 10);
    if (!Number.isNaN(percent) && percent >= 10 && percent <= 90) {
      return percent;
    }
  }
  return null;
}

export function resolveOnlineMenuDiscountPercent(
  restaurant: Pick<RestaurantListItem, 'online_menu_discount_percent' | 'promo'>,
): number | null {
  const structured =
    restaurant.online_menu_discount_percent ?? restaurant.promo?.online_menu_discount_percent ?? null;
  if (structured != null && structured >= 10) {
    return Math.round(structured);
  }
  return parseDiscountFromText(restaurant.promo?.direct_order_text);
}
