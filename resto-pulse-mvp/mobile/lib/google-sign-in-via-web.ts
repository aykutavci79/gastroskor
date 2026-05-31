import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { GoogleIdTokenClaims } from '@/lib/google-auth';

const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '');

export function getMobileGoogleReturnUri() {
  return Linking.createURL('auth/google');
}

function parseCallbackUrl(url: string): GoogleIdTokenClaims | null {
  const parsed = Linking.parse(url);
  const params = parsed.queryParams ?? {};
  const read = (key: string) => {
    const value = params[key];
    if (Array.isArray(value)) return value[0]?.trim();
    return typeof value === 'string' ? value.trim() : undefined;
  };
  const email = read('email')?.toLowerCase();
  if (!email) return null;
  return {
    sub: read('sub') || email,
    email,
    email_verified: true,
    name: read('name'),
    picture: read('picture'),
  };
}

/** Expo Go: web paneldeki NextAuth Google girisini tarayici ile acar. */
export async function signInWithGoogleViaWeb(): Promise<GoogleIdTokenClaims> {
  const returnUri = getMobileGoogleReturnUri();
  const startUrl = `${SITE_URL}/mobil-giris?return=${encodeURIComponent(returnUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUri);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error('Google girisi iptal edildi.');
  }
  if (result.type !== 'success') {
    throw new Error('Google girisi tamamlanamadi.');
  }

  const claims = parseCallbackUrl(result.url);
  if (!claims?.email) {
    throw new Error('Giris bilgisi alinamadi. Web sitesi guncel mi kontrol edin.');
  }
  return claims;
}
