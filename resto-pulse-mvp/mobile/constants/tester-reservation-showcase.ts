import { Image } from 'react-native';

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

export function resolveTesterShowcasePhotoUrls(googlePlaceId: string | null | undefined): string[] {
  if (googlePlaceId?.trim() !== TESTER_RESERVATION_SHOWCASE_PLACE_ID) return [];
  return SHOWCASE_ASSETS.map((asset) => Image.resolveAssetSource(asset).uri);
}

export function isTesterReservationShowcasePlace(googlePlaceId: string | null | undefined): boolean {
  return googlePlaceId?.trim() === TESTER_RESERVATION_SHOWCASE_PLACE_ID;
}
