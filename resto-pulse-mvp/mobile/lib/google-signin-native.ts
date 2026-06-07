import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { iosClientId, webClientId } from '@/lib/google-signin-config';

let configured = false;

export function configureGoogleSignIn() {
  if (configured || !webClientId) return;
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
  configured = true;
}

async function clearStaleAccessToken() {
  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens.accessToken) {
      await GoogleSignin.clearCachedAccessToken(tokens.accessToken);
    }
  } catch {
    /* Oturum yok veya token zaten gecersiz */
  }
}

function readIdTokenFromSignIn(response: Awaited<ReturnType<typeof GoogleSignin.signIn>>) {
  if (!isSuccessResponse(response)) return null;
  return response.data.idToken?.trim() || null;
}

async function readIdTokenAfterSignIn(
  response: Awaited<ReturnType<typeof GoogleSignin.signIn>>,
): Promise<string> {
  const fromSignIn = readIdTokenFromSignIn(response);
  if (fromSignIn) return fromSignIn;

  try {
    const tokens = await GoogleSignin.getTokens();
    const fromTokens = tokens.idToken?.trim();
    if (fromTokens) return fromTokens;
  } catch (err) {
    throw normalizeGoogleTokenError(err);
  }

  throw new Error(
    'Google idToken alinamadi. EAS production ortaminda EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Web client) tanimli olmali.',
  );
}

function normalizeGoogleTokenError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err);
  if (/authorization grant|invalid_grant|redirect.*uri|Bad Request/i.test(raw)) {
    return new Error(
      'Google oturumu tamamlanamadi. Uygulamayi Play Store uzerinden en son surume guncelleyin; sorun surerse cihazdaki Google hesabindan cikis yapip tekrar deneyin.',
    );
  }
  return err instanceof Error ? err : new Error(raw || 'Google oturum jetonu alinamadi.');
}

export async function signInWithGoogleNative(): Promise<string> {
  configureGoogleSignIn();
  if (!webClientId) {
    throw new Error('Google Web client ID yapilandirilmamis.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Signed-out / coklu hesap: onceki Google oturum kalintisini temizle
  try {
    await GoogleSignin.signOut();
  } catch {
    /* noop */
  }
  await clearStaleAccessToken();

  let response = await GoogleSignin.signIn();
  try {
    return await readIdTokenAfterSignIn(response);
  } catch (firstErr) {
    // invalid_grant vb. — bir kez daha temiz oturum dene
    try {
      await GoogleSignin.signOut();
      await clearStaleAccessToken();
      response = await GoogleSignin.signIn();
      return await readIdTokenAfterSignIn(response);
    } catch {
      throw firstErr instanceof Error ? firstErr : normalizeGoogleTokenError(firstErr);
    }
  }
}

export function readGoogleSignInError(err: unknown): string {
  if (isErrorWithCode(err)) {
    if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      return 'Google girisi iptal edildi.';
    }
    if (err.code === statusCodes.IN_PROGRESS) {
      return 'Google girisi zaten devam ediyor.';
    }
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services guncel degil veya yuklu degil.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Google girisi basarisiz.';
}

export async function signOutGoogleNative() {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    /* noop */
  }
}
