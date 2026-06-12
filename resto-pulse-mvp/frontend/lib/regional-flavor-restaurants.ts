import { getApiV1Base } from '@/lib/api-base';
import type { RestaurantListItem } from '@/lib/types';

function foldTrAscii(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

function restaurantHaystack(restaurant: RestaurantListItem): string {
  const giNames = restaurant.geo_indications?.map((gi) => gi.product).join(' ') ?? '';
  return foldTrAscii(
    [restaurant.name, restaurant.category, restaurant.district, restaurant.gi_product_name, giNames]
      .filter(Boolean)
      .join(' '),
  );
}

export function filterRestaurantsBySearchTag(
  restaurants: RestaurantListItem[],
  searchTag: string,
): RestaurantListItem[] {
  const needle = foldTrAscii(searchTag.trim());
  if (!needle) return [];

  const tokens = needle.split(/\s+/).filter((token) => token.length >= 3);

  return restaurants.filter((restaurant) => {
    const haystack = restaurantHaystack(restaurant);
    if (haystack.includes(needle)) return true;
    if (tokens.length === 0) return false;
    return tokens.every((token) => haystack.includes(token));
  });
}

function sortByGastroScore(restaurants: RestaurantListItem[]): RestaurantListItem[] {
  return [...restaurants].sort((a, b) => {
    const scoreA = a.avg_rating ?? -1;
    const scoreB = b.avg_rating ?? -1;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name, 'tr');
  });
}

export async function fetchCityRestaurants(city: string): Promise<RestaurantListItem[]> {
  try {
    const response = await fetch(`${getApiV1Base()}/restaurants?city=${encodeURIComponent(city)}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    return (await response.json()) as RestaurantListItem[];
  } catch {
    return [];
  }
}

export type RegionalFlavorRestaurantResult = {
  items: RestaurantListItem[];
  matchedByTag: boolean;
};

export async function fetchRegionalFlavorRestaurants(
  city: string,
  searchTag: string,
  limit = 10,
): Promise<RegionalFlavorRestaurantResult> {
  const all = await fetchCityRestaurants(city);
  const tagged = filterRestaurantsBySearchTag(all, searchTag);
  const sortedTagged = sortByGastroScore(tagged);

  if (sortedTagged.length > 0) {
    return { items: sortedTagged.slice(0, limit), matchedByTag: true };
  }

  return { items: sortByGastroScore(all).slice(0, limit), matchedByTag: false };
}
