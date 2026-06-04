import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { getExpoGoGoogleRedirectUri } from '@/lib/expo-google-redirect';
import { parseGoogleIdToken } from '@/lib/google-auth';
import { useSession } from '@/context/session-context';

function readClientId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

const webClientId = readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
const iosClientId = readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ?? webClientId;
const androidClientId = readClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);

/** Expo Go: auth.expo.io — Google Console redirect URI ile birebir ayni olmali. */
export const expoGoRedirectUri = getExpoGoGoogleRedirectUri();

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Play/EAS build: Google Web client'ta bu URI'ler Authorized redirect URIs listesinde olmali. */
export function getGoogleNativeRedirectUri(): string {
  if (Platform.OS === 'android' && androidClientId) {
    const prefix = androidClientId.replace('.apps.googleusercontent.com', '');
    return `com.googleusercontent.apps.${prefix}:/oauth2redirect`;
  }
  return AuthSession.makeRedirectUri({ scheme: 'gastroskor', path: 'redirect' });
}

/** Expo Go: web koprusu. Store/EAS build: Android/iOS OAuth client varsa native (1.0.5 davranisi). */
export function shouldUseNativeGoogleSignIn(): boolean {
  if (isExpoGo) return false;
  if (process.env.EXPO_PUBLIC_USE_NATIVE_GOOGLE === '1') return true;
  if (Platform.OS === 'android' && androidClientId) return true;
  if (Platform.OS === 'ios' && iosClientId) return true;
  return false;
}

export function isGoogleSignInConfigured(): boolean {
  if (isExpoGo) return Boolean(webClientId);
  if (!shouldUseNativeGoogleSignIn()) return true;
  if (!webClientId) return false;
  if (Platform.OS === 'android') return Boolean(androidClientId);
  if (Platform.OS === 'ios') return Boolean(iosClientId);
  return true;
}

export function getGoogleSignInSetupHint(): string | null {
  if (isExpoGo && !webClientId) {
    return (
      'Expo Go: mobile/.env icinde EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID doldur. ' +
      'Google Cloud Web client redirect URI: https://auth.expo.io/@delimanyah/gastroskor'
    );
  }
  if (!shouldUseNativeGoogleSignIn()) {
    return null;
  }
  if (Platform.OS === 'android' && !androidClientId) {
    return 'Android build icin EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID gerekli.';
  }
  if (Platform.OS === 'ios' && !iosClientId) {
    return 'iOS build icin EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID gerekli.';
  }
  return null;
}

export function useGoogleSignInExpoGo(onError: (message: string) => void) {
  const { signInWithGoogle } = useSession();
  // IdToken + otomatik nonce (code exchange auth.expo.io'da "Something went wrong" veriyordu).
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    iosClientId: iosClientId ?? webClientId,
    androidClientId: androidClientId ?? webClientId,
    redirectUri: expoGoRedirectUri,
    responseType: ResponseType.IdToken,
    selectAccount: true,
  });

  useEffect(() => {
    if (__DEV__) {
      console.log('[GoogleAuth] mode=expo-go redirectUri=', expoGoRedirectUri);
    }
  }, []);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      onError(response.error?.message ?? 'Google girisi iptal edildi veya reddedildi.');
      return;
    }
    if (response.type !== 'success') return;
    const idToken = response.authentication?.idToken ?? response.params?.id_token ?? null;
    if (!idToken) {
      onError('Google oturum jetonu alinamadi. Web client redirect URI kontrol edin.');
      return;
    }
    void (async () => {
      try {
        const claims = parseGoogleIdToken(idToken);
        await signInWithGoogle(claims);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Google girisi basarisiz.');
      }
    })();
  }, [response, signInWithGoogle, onError]);

  return {
    ready: Boolean(request),
    promptAsync,
  };
}

export function useGoogleSignInNative(onError: (message: string) => void) {
  const { signInWithGoogle } = useSession();
  const redirectUri = getGoogleNativeRedirectUri();
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri,
  });

  useEffect(() => {
    if (__DEV__) {
      console.log('[GoogleAuth] mode=native platform=', Platform.OS, 'redirectUri=', redirectUri);
    }
  }, [redirectUri]);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.authentication?.idToken;
    if (!idToken) {
      onError('Google oturum jetonu alinamadi.');
      return;
    }
    void (async () => {
      try {
        const claims = parseGoogleIdToken(idToken);
        await signInWithGoogle(claims);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'Google girisi basarisiz.');
      }
    })();
  }, [response, signInWithGoogle, onError]);

  return {
    ready: Boolean(request),
    promptAsync,
  };
}
