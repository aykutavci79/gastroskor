import type { RestaurantListItem } from '@/lib/types';

import { googleCardPhotosEnabled } from '@/lib/google-card-photos';

/** Google Places Photo — her img yuklemesi ucretli SKU. */
export function isBillableGooglePhotoUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(raw)) return true;
  if (/googleusercontent\.com/i.test(raw) && /place-photos|gps-cs-s|\/p\//i.test(raw)) return true;
  return false;
}

function allowedCardCoverUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  if (!googleCardPhotosEnabled() && isBillableGooglePhotoUrl(raw)) return null;
  return raw;
}

/** Kart kapagi: isletme fotosu yoksa Google'dan gelen thumbnail. */
export function resolveCardCoverUrl(restaurant: RestaurantListItem): string | null {
  return (
    allowedCardCoverUrl(restaurant.promo?.card_cover_image_url) ||
    allowedCardCoverUrl(restaurant.promo?.menu_image_url) ||
    allowedCardCoverUrl(googleCardPhotosEnabled() ? restaurant.google_photo_url : null) ||
    null
  );
}
