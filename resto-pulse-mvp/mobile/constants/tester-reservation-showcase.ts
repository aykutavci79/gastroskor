import type { ImageSourcePropType } from 'react-native';

import { localAssetUri } from '@/lib/local-asset-uri';

/** Atlas Sofra — tester rezervasyon vitrin galerisi (gastro-tester-deneme-2). */
export const TESTER_RESERVATION_SHOWCASE_PLACE_ID = 'gastro-tester-deneme-2';

const SHOWCASE_ASSETS = [
  require('@/assets/demo-restaurant/atlas-sofra-garden-day.webp'),
  require('@/assets/demo-restaurant/atlas-sofra-terrace-day.webp'),
  require('@/assets/demo-restaurant/atlas-sofra-indoor-day.webp'),
  require('@/assets/demo-restaurant/atlas-sofra-garden-evening.webp'),
  require('@/assets/demo-restaurant/atlas-sofra-terrace-evening.webp'),
  require('@/assets/demo-restaurant/atlas-sofra-indoor-evening.webp'),
] as const;

/** Doğrudan expo-image `source` için (web-safe). */
export const TESTER_SHOWCASE_SOURCES: ImageSourcePropType[] = [...SHOWCASE_ASSETS];

export function resolveTesterShowcasePhotoUrls(googlePlaceId: string | null | undefined): string[] {
  if (googlePlaceId?.trim() !== TESTER_RESERVATION_SHOWCASE_PLACE_ID) return [];
  return TESTER_SHOWCASE_SOURCES.map((asset) => localAssetUri(asset)).filter(
    (uri): uri is string => Boolean(uri),
  );
}

export function isTesterReservationShowcasePlace(googlePlaceId: string | null | undefined): boolean {
  return googlePlaceId?.trim() === TESTER_RESERVATION_SHOWCASE_PLACE_ID;
}

export function testerShowcaseSourcesForPlace(
  googlePlaceId: string | null | undefined,
): ImageSourcePropType[] {
  if (!isTesterReservationShowcasePlace(googlePlaceId)) return [];
  return TESTER_SHOWCASE_SOURCES;
}
