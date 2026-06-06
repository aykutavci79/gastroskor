import type { LivePlaceSearchItem, RestaurantListItem } from '@/lib/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

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
    google_photo_url: item.google_photo_url ?? null,
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

export type LiveScoreQuery = {
  gastro_score: number;
  distance_score: number;
  rating_score: number;
  distance_meters: number | null;
  distance_origin: 'user' | 'city_center';
  rating: number | null;
};

function appendLiveScores(href: string, scores: LiveScoreQuery): string {
  const q = new URLSearchParams();
  q.set('gastro', String(scores.gastro_score));
  q.set('ds', String(scores.distance_score));
  q.set('rs', String(scores.rating_score));
  if (scores.distance_meters != null) q.set('dm', String(scores.distance_meters));
  q.set('do', scores.distance_origin);
  if (scores.rating != null) q.set('gr', String(scores.rating));
  return `${href}?${q.toString()}`;
}

/** Trend / city-top kartlari: GS UUID veya Google place detay sayfasi */
export function trendingDetailHref(item: {
  id: string;
  restaurant_id?: string | null;
  google_place_id?: string | null;
}): string {
  const gsId = item.restaurant_id?.trim();
  if (gsId && isUuid(gsId)) return `/restaurants/${gsId}`;
  if (isUuid(item.id)) return `/restaurants/${item.id}`;
  const placeId = (item.google_place_id ?? item.id).trim();
  return `/place/${encodeURIComponent(placeId)}`;
}

/** GS uyesi UUID veya Google place_id ile detay sayfasi */
export function livePlaceDetailHref(item: LivePlaceSearchItem): string {
  if (item.restaurant_id) {
    return `/restaurants/${item.restaurant_id}`;
  }
  const href = `/place/${encodeURIComponent(item.place_id)}`;
  return appendLiveScores(href, {
    gastro_score: item.gastro_score,
    distance_score: item.distance_score,
    rating_score: item.rating_score,
    distance_meters: item.distance_meters,
    distance_origin: item.distance_origin,
    rating: item.rating,
  });
}

export function parseLiveScoreSearchParams(
  searchParams: { get: (key: string) => string | null },
): LiveScoreQuery | null {
  const gastro = Number(searchParams.get('gastro'));
  if (!Number.isFinite(gastro)) return null;
  const ds = Number(searchParams.get('ds'));
  const rs = Number(searchParams.get('rs'));
  const dmRaw = searchParams.get('dm');
  const dm = dmRaw != null && dmRaw !== '' ? Number(dmRaw) : null;
  const doRaw = searchParams.get('do');
  const grRaw = searchParams.get('gr');
  const gr = grRaw != null && grRaw !== '' ? Number(grRaw) : null;
  return {
    gastro_score: gastro,
    distance_score: Number.isFinite(ds) ? ds : 0,
    rating_score: Number.isFinite(rs) ? rs : 0,
    distance_meters: dm != null && Number.isFinite(dm) ? dm : null,
    distance_origin: doRaw === 'user' ? 'user' : 'city_center',
    rating: gr != null && Number.isFinite(gr) ? gr : null,
  };
}
