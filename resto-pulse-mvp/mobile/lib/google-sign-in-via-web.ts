import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { GoogleIdTokenClaims } from '@/lib/google-auth';

export function getMobileGoogleSiteUrl(): string {
  return (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://www.gastroskor.com.tr').replace(/\/$/, '');
}

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
  const siteUrl = getMobileGoogleSiteUrl();
  const returnUri = getMobileGoogleReturnUri();
  const startUrl = `${siteUrl}/mobil-giris?return=${encodeURIComponent(returnUri)}`;
  const result = await WebBrowser.openAuthSessionAsync(startUrl, returnUri);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new Error(
      'Google girisi tamamlanamadi (pencere kapandi). Vercel GOOGLE_CLIENT_SECRET guncel mi? ' +
        'Google hesap seciminde Test users listesindeki Gmail ile gir (orn. coolisback@gmail.com). ' +
        'Gecici: uygulamada E-posta ile devam et.',
    );
  }
  if (result.type !== 'success') {
    throw new Error('Google girisi tamamlanamadi.');
  }

  const claims = parseCallbackUrl(result.url);
  const oauthError = typeof claims === 'object' && claims && 'error' in claims ? String(claims.error) : null;
  if (oauthError) {
    throw new Error(
      oauthError === 'AccessDenied'
        ? 'Google bu hesaba izin vermedi. Cloud Console OAuth Testing ise Gmail adresini Test users listesine ekle.'
        : `Google giris hatasi: ${oauthError}`,
    );
  }
  if (!claims?.email) {
    throw new Error('Giris bilgisi alinamadi. www.gastroskor.com.tr guncel mi ve Vercel NEXTAUTH_URL dogru mu kontrol edin.');
  }
  return claims;
}
