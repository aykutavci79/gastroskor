import type { Metadata } from 'next';

export const TESTER_SEED_PLACE_ID_PREFIX = 'gastro-tester-';

export function isTesterSeedRestaurant(item: {
  google_place_id?: string | null;
  seo_noindex?: boolean;
}): boolean {
  if (item.seo_noindex) return true;
  const placeId = item.google_place_id?.trim();
  return Boolean(placeId?.startsWith(TESTER_SEED_PLACE_ID_PREFIX));
}

export function testerRestaurantRobots(): NonNullable<Metadata['robots']> {
  return {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  };
}
