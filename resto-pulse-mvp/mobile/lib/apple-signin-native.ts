import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

export function isAppleSignInAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function isAppleSignInSupported(): Promise<boolean> {
  if (!isAppleSignInAvailable()) return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export type AppleSignInResult = {
  identityToken: string;
  fullName: string | null;
};

export async function signInWithAppleNative(): Promise<AppleSignInResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const identityToken = credential.identityToken?.trim();
  if (!identityToken) {
    throw new Error('Apple oturum jetonu alinamadi.');
  }

  const parts = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean);
  const fullName = parts.length ? parts.join(' ').trim() : null;

  return { identityToken, fullName };
}

export function readAppleSignInError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code ?? '');
    if (code === 'ERR_REQUEST_CANCELED') {
      return 'Apple girisi iptal edildi.';
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return 'Apple ile giris basarisiz.';
}
