import type { LivePlaceSearchItem, RestaurantListItem } from '@/lib/types';

/** Canli arama sonucunu liste kartina donusturur. */
export function livePlaceToRestaurantCard(item: LivePlaceSearchItem): RestaurantListItem {
  const address = item.address?.trim() || null;
  return {
    id: item.restaurant_id ?? item.place_id,
    restaurant_id: item.restaurant_id ?? null,
    name: item.name,
    city: null,
    district: address,
    category: 'Restoran',
    avg_rating: item.member_avg_rating ?? null,
    google_rating: item.rating,
    google_review_count: item.user_ratings_total,
    promo: item.promo,
    is_premium_partner: item.is_premium_partner,
    menu_preview: item.menu_preview,
    menu_item_count: item.menu_item_count,
    maps_directions_url: item.maps_directions_url,
    distance_meters: item.distance_meters,
    google_place_id: item.place_id,
    google_photo_url: item.google_photo_url ?? null,
    check_in_visitor_count: item.check_in_visitor_count ?? 0,
    geo_indications: [],
    has_geographical_indication: false,
    gi_product_name: null,
    gastro_score: item.gastro_score,
    distance_score: item.distance_score,
    rating_score: item.rating_score,
    popularity_score: item.popularity_score ?? null,
  };
}

/** Canli arama sonuclarini GastroSkor'a gore siralar (API sirasini korur). */
export function sortLivePlacesByGastroScore(items: LivePlaceSearchItem[]): LivePlaceSearchItem[] {
  return [...items].sort(
    (a, b) =>
      (b.gastro_score ?? 0) - (a.gastro_score ?? 0) ||
      (a.distance_meters ?? 1e12) - (b.distance_meters ?? 1e12) ||
      (b.rating ?? 0) - (a.rating ?? 0),
  );
}

export function livePlaceDistanceLabel(item: LivePlaceSearchItem): string | undefined {
  if (item.distance_meters == null) return undefined;
  const m = item.distance_meters;
  const dist = m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const origin = item.distance_origin === 'user' ? 'konumun' : 'merkez';
  return `${dist} · ${origin}`;
}

export function livePlaceGoogleId(item: LivePlaceSearchItem): string {
  return item.place_id;
}
