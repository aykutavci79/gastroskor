import { resolveCardRatingScore } from '@/lib/rating-band-visual';
import type { RestaurantListItem } from '@/lib/types';

/** Yuksek puandan dusuge (Google oncelikli, yoksa GS). */
export function sortRestaurantsByRatingDesc(items: RestaurantListItem[]): RestaurantListItem[] {
  return [...items].sort((a, b) => {
    const scoreA =
      resolveCardRatingScore({
        googleRating: a.google_rating,
        gastroRating: a.avg_rating,
      }) ?? -1;
    const scoreB =
      resolveCardRatingScore({
        googleRating: b.google_rating,
        gastroRating: b.avg_rating,
      }) ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name, 'tr');
  });
}

export function formatFollowListRating(restaurant: RestaurantListItem): string | null {
  const score = resolveCardRatingScore({
    googleRating: restaurant.google_rating,
    gastroRating: restaurant.avg_rating,
  });
  if (score == null) return null;
  const source = restaurant.google_rating != null ? 'Google' : 'GS';
  return `${source} ${score.toFixed(1)}`;
}
