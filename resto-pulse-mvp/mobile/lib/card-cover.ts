import type { RestaurantListItem } from '@/lib/types';

/** Kart kapagi: isletme fotosu yoksa Google'dan gelen thumbnail. */
export function resolveCardCoverUrl(restaurant: RestaurantListItem): string | null {
  return (
    restaurant.promo?.card_cover_image_url?.trim() ||
    restaurant.promo?.menu_image_url?.trim() ||
    restaurant.google_photo_url?.trim() ||
    null
  );
}
