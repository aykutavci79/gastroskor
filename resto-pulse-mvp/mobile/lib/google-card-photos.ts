/** Google Places kart/detay foto — varsayilan kapali (Places Photo ucreti). */
export function googleCardPhotosEnabled(): boolean {
  return process.env.EXPO_PUBLIC_GOOGLE_CARD_PHOTOS === 'true';
}
