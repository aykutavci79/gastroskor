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
