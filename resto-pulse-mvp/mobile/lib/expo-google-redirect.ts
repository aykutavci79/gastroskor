import Constants from 'expo-constants';

const FALLBACK = 'https://auth.expo.io/@delimanyah/gastroskor';

/** Expo Go Google redirect — .env veya manifest @owner/slug ile uyumlu olmali. */
export function getExpoGoGoogleRedirectUri(): string {
  const fromEnv = process.env.EXPO_PUBLIC_EXPO_AUTH_REDIRECT?.trim();
  if (fromEnv) return fromEnv;

  const originalFullName = Constants.expoConfig?.originalFullName?.trim();
  if (originalFullName) {
    return `https://auth.expo.io/${originalFullName}`;
  }

  const owner = Constants.expoConfig?.owner?.trim();
  const slug = Constants.expoConfig?.slug?.trim() ?? 'gastroskor';
  if (owner) {
    return `https://auth.expo.io/@${owner}/${slug}`;
  }

  return FALLBACK;
}
