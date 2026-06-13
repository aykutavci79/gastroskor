import type { RestaurantListItem } from '@/lib/types';

import { googleCardPhotosEnabled } from '@/lib/google-card-photos';

/** Kart kapagi: isletme fotosu yoksa Google'dan gelen thumbnail. */
export function resolveCardCoverUrl(restaurant: RestaurantListItem): string | null {
  return (
    restaurant.promo?.card_cover_image_url?.trim() ||
    restaurant.promo?.menu_image_url?.trim() ||
    (googleCardPhotosEnabled() ? restaurant.google_photo_url?.trim() : null) ||
    null
  );
}

/** Kart genisligine gore Google foto URL'sini kucult (Lighthouse image delivery). */
export function optimizeCardCoverUrl(url: string | null | undefined, displayWidth: number): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  const target = Math.min(640, Math.max(120, Math.round(displayWidth * 2)));

  if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      parsed.searchParams.set('maxwidth', String(target));
      return parsed.toString();
    } catch {
      return raw;
    }
  }

  const sized = raw.replace(/(-s\d+-w)\d+/i, `$1${target}`);
  return sized !== raw ? sized : raw;
}
