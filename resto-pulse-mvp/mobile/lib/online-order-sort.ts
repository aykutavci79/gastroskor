import { haversineMeters } from '@/lib/travel-estimate';
import { resolveOnlineMenuDiscountPercent } from '@/lib/resolve-online-discount';
import type { RestaurantListItem } from '@/lib/types';

export type OnlineOrderSortMode = 'gastro_score' | 'distance' | 'rating' | 'popularity' | 'discount';

export const ONLINE_ORDER_SORT_OPTIONS: { id: OnlineOrderSortMode; label: string }[] = [
  { id: 'gastro_score', label: 'GastroSkor' },
  { id: 'distance', label: 'Yakınlık' },
  { id: 'rating', label: 'Puan' },
  { id: 'popularity', label: 'Yorum' },
  { id: 'discount', label: 'En yüksek indirim' },
];

function discountOf(row: RestaurantListItem): number {
  return resolveOnlineMenuDiscountPercent(row) ?? 0;
}

function ratingOf(row: RestaurantListItem): number {
  return row.google_rating ?? row.avg_rating ?? 0;
}

function reviewCountOf(row: RestaurantListItem): number {
  return row.google_review_count ?? row.google_user_ratings_total ?? 0;
}

/** Konum varken mesafeyi client'ta yeniden hesapla — chip sıralaması anında yansır. */
export function enrichOnlineOrderDistances(
  items: RestaurantListItem[],
  origin: { lat: number; lng: number } | null | undefined,
): RestaurantListItem[] {
  if (!origin) return items;
  return items.map((row) => {
    if (row.latitude == null || row.longitude == null) return row;
    return {
      ...row,
      distance_meters: haversineMeters(origin.lat, origin.lng, row.latitude, row.longitude),
    };
  });
}

export function sortOnlineOrderRestaurants(
  items: RestaurantListItem[],
  mode: OnlineOrderSortMode,
  origin?: { lat: number; lng: number } | null,
): RestaurantListItem[] {
  const prepared = enrichOnlineOrderDistances(items, origin);
  const copy = [...prepared];

  if (mode === 'distance') {
    copy.sort(
      (a, b) =>
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12) ||
        ratingOf(b) - ratingOf(a),
    );
    return copy;
  }
  if (mode === 'rating') {
    copy.sort(
      (a, b) =>
        ratingOf(b) - ratingOf(a) ||
        reviewCountOf(b) - reviewCountOf(a) ||
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12),
    );
    return copy;
  }
  if (mode === 'popularity') {
    copy.sort(
      (a, b) =>
        reviewCountOf(b) - reviewCountOf(a) ||
        ratingOf(b) - ratingOf(a) ||
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12),
    );
    return copy;
  }
  if (mode === 'discount') {
    copy.sort(
      (a, b) =>
        discountOf(b) - discountOf(a) ||
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12) ||
        ratingOf(b) - ratingOf(a),
    );
    return copy;
  }
  copy.sort(
    (a, b) =>
      (b.gastro_score ?? 0) - (a.gastro_score ?? 0) ||
      (b.popularity_score ?? 0) - (a.popularity_score ?? 0) ||
      ratingOf(b) - ratingOf(a) ||
      (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12),
  );
  return copy;
}
