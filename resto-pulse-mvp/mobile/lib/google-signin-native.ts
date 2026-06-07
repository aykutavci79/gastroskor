import { iosClientId, webClientId } from '@/lib/google-signin-config';
import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let googleSignInModule: GoogleSignInModule | null = null;
let configured = false;

async function loadGoogleSignIn(): Promise<GoogleSignInModule> {
  if (!googleSignInModule) {
    googleSignInModule = await import('@react-native-google-signin/google-signin');
  }
  return googleSignInModule;
}

export async function configureGoogleSignIn() {
  if (configured || !webClientId) return;
  if (Platform.OS === 'ios' && !iosClientId) {
    throw new Error(
      'iOS Google client ID yapilandirilmamis. EAS production ortamina EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ekleyip yeni build alin.',
    );
  }
  const { GoogleSignin } = await loadGoogleSignIn();
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    offlineAccess: false,
    scopes: ['email', 'profile'],
  });
  configured = true;
}

async function clearStaleAccessToken(GoogleSignin: GoogleSignInModule['GoogleSignin']) {
  try {
    const tokens = await GoogleSignin.getTokens();
    if (tokens.accessToken) {
      await GoogleSignin.clearCachedAccessToken(tokens.accessToken);
    }
  } catch {
    /* Oturum yok veya token zaten gecersiz */
  }
}

function readIdTokenFromSignIn(
  response: Awaited<ReturnType<GoogleSignInModule['GoogleSignin']['signIn']>>,
  isSuccessResponse: GoogleSignInModule['isSuccessResponse'],
) {
  if (!isSuccessResponse(response)) return null;
  return response.data.idToken?.trim() || null;
}

async function readIdTokenAfterSignIn(
  GoogleSignin: GoogleSignInModule['GoogleSignin'],
  isSuccessResponse: GoogleSignInModule['isSuccessResponse'],
  response: Awaited<ReturnType<GoogleSignInModule['GoogleSignin']['signIn']>>,
): Promise<string> {
  const fromSignIn = readIdTokenFromSignIn(response, isSuccessResponse);
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
  if (!webClientId) {
    throw new Error('Google Web client ID yapilandirilmamis.');
  }
  if (Platform.OS === 'ios' && !iosClientId) {
    throw new Error(
      'iOS Google client ID yapilandirilmamis. EAS production ortamina EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ekleyip yeni build alin.',
    );
  }

  const { GoogleSignin, isSuccessResponse } = await loadGoogleSignIn();
  await configureGoogleSignIn();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    await GoogleSignin.signOut();
  } catch {
    /* noop */
  }
  await clearStaleAccessToken(GoogleSignin);

  let response = await GoogleSignin.signIn();
  try {
    return await readIdTokenAfterSignIn(GoogleSignin, isSuccessResponse, response);
  } catch (firstErr) {
    try {
      await GoogleSignin.signOut();
      await clearStaleAccessToken(GoogleSignin);
      response = await GoogleSignin.signIn();
      return await readIdTokenAfterSignIn(GoogleSignin, isSuccessResponse, response);
    } catch {
      throw firstErr instanceof Error ? firstErr : normalizeGoogleTokenError(firstErr);
    }
  }
}

export function readGoogleSignInError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: unknown }).code ?? '');
    if (code === 'SIGN_IN_CANCELLED') return 'Google girisi iptal edildi.';
    if (code === 'IN_PROGRESS') return 'Google girisi zaten devam ediyor.';
    if (code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      return 'Google Play Services guncel degil veya yuklu degil.';
    }
  }
  if (err instanceof Error) return err.message;
  return 'Google girisi basarisiz.';
}

export async function signOutGoogleNative() {
  try {
    const { GoogleSignin } = await loadGoogleSignIn();
    await configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    /* noop */
  }
}
