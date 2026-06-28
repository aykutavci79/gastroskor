import { allowedCardCoverUrl } from '@/lib/card-cover';
import { googleCardPhotosEnabled } from '@/lib/google-card-photos';
import { resolveTesterShowcasePhotoUrls } from '@/constants/tester-reservation-showcase';
import type { RestaurantListItem } from '@/lib/types';

function pushUnique(urls: string[], candidate: string | null | undefined) {
  const url = allowedCardCoverUrl(candidate);
  if (!url || urls.includes(url)) return;
  urls.push(url);
}

/** Rezervasyon kartı — en az 2 farklı açı için kapak + menü + salon planı arka planı. */
export function resolveRestaurantHeroPhotos(
  restaurant: RestaurantListItem,
  options?: { floorBackgroundUrl?: string | null },
): string[] {
  const urls: string[] = [];
  for (const url of restaurant.promo?.gallery_image_urls ?? []) {
    pushUnique(urls, url);
  }
  for (const url of resolveTesterShowcasePhotoUrls(restaurant.google_place_id)) {
    pushUnique(urls, url);
  }
  pushUnique(urls, restaurant.promo?.card_cover_image_url);
  pushUnique(urls, restaurant.promo?.menu_image_url);
  pushUnique(urls, options?.floorBackgroundUrl);
  if (googleCardPhotosEnabled()) {
    pushUnique(urls, restaurant.google_photo_url);
  }
  return urls;
}

export const MIN_RESTAURANT_HERO_PHOTOS = 2;
