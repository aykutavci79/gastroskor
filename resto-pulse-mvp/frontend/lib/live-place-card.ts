import type { LivePlaceSearchItem, RestaurantListItem } from '@/lib/types';

/** Canli arama sonucunu liste kartina donusturur. */
export function livePlaceToRestaurantCard(item: LivePlaceSearchItem): RestaurantListItem {
  const address = item.address?.trim() || null;
  return {
    id: item.restaurant_id ?? item.place_id,
    name: item.name,
    city: null,
    district: address,
    category: null,
    avg_rating: item.member_avg_rating ?? null,
    google_rating: item.rating,
    google_review_count: item.user_ratings_total,
    promo: item.promo,
    is_premium_partner: item.is_premium_partner,
    menu_preview: item.menu_preview,
    menu_item_count: item.menu_item_count,
    card_emoji: item.card_emoji,
    maps_directions_url: item.maps_directions_url,
    distance_meters: item.distance_meters,
    geo_indications: [],
    has_geographical_indication: false,
    gi_product_name: null,
  };
}

export function livePlaceDistanceLabel(item: LivePlaceSearchItem): string | undefined {
  if (item.distance_meters == null) return undefined;
  const m = item.distance_meters;
  const dist = m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const origin = item.distance_origin === 'user' ? 'konumun' : 'merkez';
  return `${dist} · ${origin}`;
}
