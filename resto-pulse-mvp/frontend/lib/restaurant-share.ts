import type { RestaurantListItem } from '@/lib/types';

const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type RestaurantShareInput = Pick<
  RestaurantListItem,
  'id' | 'name' | 'city' | 'district' | 'avg_rating' | 'google_rating' | 'restaurant_id' | 'google_place_id'
>;

function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

function resolveDetailId(restaurant: RestaurantShareInput): string | null {
  const rid = restaurant.restaurant_id?.trim();
  if (rid && isUuid(rid)) return rid;
  if (isUuid(restaurant.id)) return restaurant.id;
  return null;
}

export function buildRestaurantPublicUrl(restaurant: RestaurantShareInput): string {
  const uuid = resolveDetailId(restaurant);
  if (uuid) return `${SITE_BASE}/restaurants/${uuid}`;
  const placeId =
    restaurant.google_place_id?.trim() ||
    (restaurant.id && !isUuid(restaurant.id) ? restaurant.id.trim() : '');
  if (placeId) return `${SITE_BASE}/place/${encodeURIComponent(placeId)}`;
  return SITE_BASE;
}

export function buildRestaurantShareText(
  restaurant: RestaurantShareInput,
  options?: { googleRating?: number | null; gastroRating?: number | null },
): string {
  const lines = [`🍽️ ${restaurant.name.trim()} — GastroSkor`];
  const location = [restaurant.district, restaurant.city].filter(Boolean).join(' · ');
  if (location) lines.push(`📍 ${location}`);
  const google = options?.googleRating ?? restaurant.google_rating;
  const gastro = options?.gastroRating ?? restaurant.avg_rating;
  if (google != null) lines.push(`⭐ Google ${google.toFixed(1)}`);
  if (gastro != null) lines.push(`★ GS ${gastro.toFixed(1)}`);
  lines.push(buildRestaurantPublicUrl(restaurant));
  return lines.join('\n');
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
