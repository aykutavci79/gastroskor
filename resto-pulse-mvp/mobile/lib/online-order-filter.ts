import { normalizeCategorySlug } from '@/constants/online-order-categories';
import type { RestaurantListItem } from '@/lib/types';

export function restaurantTrustRating(restaurant: RestaurantListItem): number | null {
  const rating = restaurant.google_rating ?? restaurant.avg_rating;
  return rating != null && rating > 0 ? rating : null;
}

function normalizedTags(restaurant: RestaurantListItem): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of restaurant.online_order_categories ?? []) {
    const normalized = normalizeCategorySlug(slug);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

/** Mutfak OR mantigi: bos secim = tum mutfaklar. */
export function matchesKitchenFilter(
  restaurant: RestaurantListItem,
  selectedSlugs: string[],
): boolean {
  if (!selectedSlugs.length) return true;
  const tags = normalizedTags(restaurant);
  return selectedSlugs.some((slug) => tags.includes(normalizeCategorySlug(slug)));
}

export function filterOnlineOrderRestaurants(
  items: RestaurantListItem[],
  opts: {
    selectedSlugs: string[];
    minRating: number;
    maxDistanceKm: number;
    hasCoords: boolean;
  },
): RestaurantListItem[] {
  const maxMeters = opts.maxDistanceKm * 1000;
  return items.filter((restaurant) => {
    if (!matchesKitchenFilter(restaurant, opts.selectedSlugs)) return false;
    const rating = restaurantTrustRating(restaurant);
    if (rating == null || rating + 0.001 < opts.minRating) return false;
    if (
      opts.hasCoords &&
      restaurant.distance_meters != null &&
      restaurant.distance_meters > maxMeters
    ) {
      return false;
    }
    return true;
  });
}

export function toggleKitchenSlug(selected: string[], slug: string): string[] {
  return selected.includes(slug) ? selected.filter((row) => row !== slug) : [...selected, slug];
}
