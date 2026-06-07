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
  });
  configured = true;
}

export async function signInWithGoogleNative(): Promise<string> {
  configureGoogleSignIn();
  if (!webClientId) {
    throw new Error('Google Web client ID yapilandirilmamis.');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    throw new Error('Google girisi iptal edildi.');
  }

  const { idToken } = await GoogleSignin.getTokens();
  if (!idToken?.trim()) {
    throw new Error('Google oturum jetonu alinamadi. Web client ID kontrol edin.');
  }
  return idToken.trim();
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
  return err instanceof Error ? err.message : 'Google girisi basarisiz.';
}

export async function signOutGoogleNative() {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    /* noop */
  }
}
