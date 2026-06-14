import { searchLivePlaces } from '@/lib/api';
import type { LivePlaceSearchItem } from '@/lib/types';

/** Yoresel detay: yerel sonuc — 20 km tavan (backend query parser metre ile). */
export const REGIONAL_FLAVOR_MAX_DISTANCE_M = 20_000;

export const REGIONAL_FLAVOR_RATING_BAND_STRICT = '4.5-5.0' as const;

/** Gosterim etiketi — kullaniciya gorunen arama metni */
export function regionalFlavorLiveSearchLabel(liveSearchQuery: string, minStars = 4.5): string {
  const query = liveSearchQuery.trim();
  if (!query) return minStars >= 4.5 ? '4.5 yıldız' : '4+ yıldız';
  return minStars >= 4.5 ? `${query} 4.5 yıldız` : `${query} 4+ yıldız`;
}

export function regionalFlavorLiveSearchQuery(liveSearchQuery: string): string {
  const query = liveSearchQuery.trim();
  if (!query) return `${REGIONAL_FLAVOR_MAX_DISTANCE_M} m`;
  return `${query} ${REGIONAL_FLAVOR_MAX_DISTANCE_M} m`;
}

export type RegionalFlavorSearchOutcome = {
  items: LivePlaceSearchItem[];
  displayLabel: string;
  searchNote: string;
};

type SearchAttempt = {
  q: string;
  rating_band?: string;
  displayLabel: string;
  noteLine: string;
};

function buildAttempts(liveSearchQuery: string): SearchAttempt[] {
  const query = liveSearchQuery.trim();
  const asciiQuery = query.replace(/ı/g, 'i').replace(/İ/g, 'I');
  const queries = query ? Array.from(new Set([query, asciiQuery].filter(Boolean))) : [''];

  const attempts: SearchAttempt[] = [];

  for (const q of queries) {
    attempts.push({
      q: regionalFlavorLiveSearchQuery(q),
      rating_band: REGIONAL_FLAVOR_RATING_BAND_STRICT,
      displayLabel: regionalFlavorLiveSearchLabel(q, 4.5),
      noteLine: '20 km içinde · 4.5+ puan',
    });
    attempts.push({
      q: `${q} 4 yıldız ${REGIONAL_FLAVOR_MAX_DISTANCE_M} m`.trim(),
      displayLabel: regionalFlavorLiveSearchLabel(q, 4),
      noteLine: '20 km içinde · 4+ puan',
    });
    attempts.push({
      q: q || 'restoran',
      displayLabel: q || 'restoran',
      noteLine: 'puana, yorum sayısına ve mesafeye göre',
    });
  }

  return attempts;
}

/** Once 4.5+, bos ise 4+, sonra filtresiz — yoresel urunlerde bos sonucu onler. */
export async function searchRegionalFlavorPlaces(params: {
  liveSearchQuery: string;
  city: string;
  limit?: number;
  origin_lat?: number;
  origin_lng?: number;
}): Promise<RegionalFlavorSearchOutcome> {
  const { liveSearchQuery, city, limit = 20, origin_lat, origin_lng } = params;
  const attempts = buildAttempts(liveSearchQuery);
  const primaryLabel = regionalFlavorLiveSearchLabel(liveSearchQuery.trim(), 4.5);

  for (const attempt of attempts) {
    const live = await searchLivePlaces({
      q: attempt.q,
      city,
      limit,
      origin_lat,
      origin_lng,
      rating_band: attempt.rating_band,
    });
    if (live.items.length > 0) {
      return {
        items: live.items,
        displayLabel: attempt.displayLabel,
        searchNote: `Canlı arama: "${attempt.displayLabel}" · ${attempt.noteLine} · sıralı.`,
      };
    }
  }

  return {
    items: [],
    displayLabel: primaryLabel,
    searchNote: `"${primaryLabel}" için yakın çevrede sonuç bulunamadı. Ana sayfada aramayı dene.`,
  };
}
