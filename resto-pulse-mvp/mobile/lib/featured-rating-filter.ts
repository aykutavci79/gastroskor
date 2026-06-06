type RatedItem = {
  week_avg_rating?: number | null;
  google_rating?: number | null;
  avg_rating?: number | null;
};

function itemRating(item: RatedItem): number {
  return item.week_avg_rating ?? item.google_rating ?? item.avg_rating ?? 0;
}

/** Once 4.5+ dene; 6'dan azsa 4.0+ ile tamamla. */
export function filterFeaturedByRating<T extends RatedItem>(
  items: T[],
  limit: number,
  primaryMin = 4.5,
  fallbackMin = 4.0,
): T[] {
  const primary = items.filter((row) => itemRating(row) >= primaryMin);
  if (primary.length >= limit) return primary.slice(0, limit);
  const fallback = items.filter((row) => itemRating(row) >= fallbackMin);
  return fallback.slice(0, limit);
}
