const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function resolveRestaurantDetailId(item: {
  id: string;
  restaurant_id?: string | null;
}): string | null {
  if (item.restaurant_id && isUuid(item.restaurant_id)) return item.restaurant_id;
  if (isUuid(item.id)) return item.id;
  return null;
}

/** UUID veya Google place_id ile detay sayfasi rotasi */
export function restaurantDetailHref(item: {
  id: string;
  restaurant_id?: string | null;
  google_place_id?: string | null;
}): string | null {
  const uuid = resolveRestaurantDetailId(item);
  if (uuid) return `/restaurant/${uuid}`;
  const placeFromField = item.google_place_id?.trim();
  const placeFromId = isUuid(item.id) ? '' : item.id.trim();
  const placeId = placeFromField || placeFromId;
  if (placeId) return `/restaurant/${encodeURIComponent(placeId)}`;
  return null;
}
