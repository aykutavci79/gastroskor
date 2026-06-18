import { getDiscoverReviewTicker, listRestaurantReviews, listRestaurants } from '@/lib/api';

export type KesfetReviewTickerItem = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  rating: number;
  review_text: string;
  snippet: string;
  author_label?: string | null;
};

function buildSnippet(text: string, maxWords = 5): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(' ')}…`;
}

async function loadReviewTickerFallback(city: string): Promise<KesfetReviewTickerItem[]> {
  const restaurants = await listRestaurants({ city, limit: 24 });
  const items: KesfetReviewTickerItem[] = [];

  for (const restaurant of restaurants) {
    if (items.length >= 16) break;
    const reviews = await listRestaurantReviews(restaurant.id, null, { kind: 'visit', limit: 30 });
    for (const review of reviews) {
      if (review.source_platform) continue;
      if ((review.rating ?? 0) < 4) continue;
      const text = (review.review_text ?? '').trim();
      if (!text) continue;
      items.push({
        id: review.id,
        restaurant_id: review.restaurant_id,
        restaurant_name: restaurant.name,
        rating: review.rating,
        review_text: text,
        snippet: buildSnippet(text),
        author_label: review.author_name ?? null,
      });
      if (items.length >= 16) break;
    }
  }

  return items;
}

export async function loadKesfetReviewTicker(city: string): Promise<KesfetReviewTickerItem[]> {
  try {
    const response = await getDiscoverReviewTicker({ city, limit: 16 });
    return response.items ?? [];
  } catch {
    try {
      return await loadReviewTickerFallback(city);
    } catch {
      return [];
    }
  }
}
