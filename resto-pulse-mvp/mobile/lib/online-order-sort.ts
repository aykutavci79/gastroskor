import type { RestaurantListItem } from '@/lib/types';

export type OnlineOrderSortMode = 'gastro_score' | 'distance' | 'rating' | 'popularity';

export const ONLINE_ORDER_SORT_OPTIONS: { id: OnlineOrderSortMode; label: string }[] = [
  { id: 'gastro_score', label: 'GastroSkor' },
  { id: 'distance', label: 'Yakınlık' },
  { id: 'rating', label: 'Puan' },
  { id: 'popularity', label: 'Yorum' },
];

function ratingOf(row: RestaurantListItem): number {
  return row.google_rating ?? row.avg_rating ?? 0;
}

export function sortOnlineOrderRestaurants(
  items: RestaurantListItem[],
  mode: OnlineOrderSortMode,
): RestaurantListItem[] {
  const copy = [...items];
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
        (b.google_review_count ?? 0) - (a.google_review_count ?? 0) ||
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12),
    );
    return copy;
  }
  if (mode === 'popularity') {
    copy.sort(
      (a, b) =>
        (b.google_review_count ?? 0) - (a.google_review_count ?? 0) ||
        ratingOf(b) - ratingOf(a) ||
        (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12),
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
