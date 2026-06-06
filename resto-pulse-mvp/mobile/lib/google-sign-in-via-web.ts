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

function matchesReturnUri(callbackUrl: string, returnUri: string): boolean {
  if (callbackUrl.startsWith(returnUri)) return true;
  try {
    const callback = Linking.parse(callbackUrl);
    const expected = Linking.parse(returnUri);
    return callback.path === expected.path && callback.hostname === expected.hostname;
  } catch {
    return false;
  }
}

const DISMISS_ERROR =
  'Google girisi tamamlanamadi (pencere kapandi). Vercel GOOGLE_CLIENT_SECRET guncel mi? ' +
  'Google hesap seciminde Test users listesindeki Gmail ile gir (orn. coolisback@gmail.com). ' +
  'Gecici: uygulamada E-posta ile devam et.';

/** Store build: web paneldeki NextAuth Google girisini tarayici ile acar. */
export async function signInWithGoogleViaWeb(): Promise<GoogleIdTokenClaims> {
  const siteUrl = getMobileGoogleSiteUrl();
  const returnUri = getMobileGoogleReturnUri();
  const startUrl = `${siteUrl}/mobil-giris?return=${encodeURIComponent(returnUri)}`;

  if (__DEV__) {
    console.log('[GoogleAuth] web-bridge start=', startUrl, 'return=', returnUri);
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (claims: GoogleIdTokenClaims) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      resolve(claims);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      reject(new Error(message));
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!matchesReturnUri(url, returnUri)) return;
      const claims = parseCallbackUrl(url);
      if (claims?.email) {
        void WebBrowser.dismissBrowser();
        finish(claims);
      }
    });

    void WebBrowser.openAuthSessionAsync(startUrl, returnUri).then((result) => {
      if (settled) return;

      if (result.type === 'success') {
        const claims = parseCallbackUrl(result.url);
        if (claims?.email) {
          finish(claims);
          return;
        }
        fail('Giris bilgisi alinamadi. www.gastroskor.com.tr guncel mi ve Vercel NEXTAUTH_URL dogru mu kontrol edin.');
        return;
      }

      if (result.type === 'cancel' || result.type === 'dismiss') {
        fail(DISMISS_ERROR);
        return;
      }

      fail('Google girisi tamamlanamadi.');
    });
  });
}
