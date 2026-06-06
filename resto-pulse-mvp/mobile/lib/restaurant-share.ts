import type { RestaurantListItem } from '@/lib/types';
import { isUuid, resolveRestaurantDetailId } from '@/lib/uuid';

const SITE_BASE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '');

export type RestaurantShareInput = Pick<
  RestaurantListItem,
  'id' | 'name' | 'city' | 'district' | 'avg_rating' | 'google_rating' | 'restaurant_id' | 'google_place_id'
>;

export function buildRestaurantPublicUrl(restaurant: RestaurantShareInput): string {
  const uuid = resolveRestaurantDetailId(restaurant);
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

/** Gurme sistem odalarinda kart paylasimi kapali; kullanici odalarinda acik (ileride). */
export function canEmbedRestaurantCardInChatRoom(room: { allow_restaurant_cards?: boolean }): boolean {
  return Boolean(room.allow_restaurant_cards);
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
