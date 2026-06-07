import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'gastroskor.google.oauth.pending.v1';

export type GoogleOAuthPending = {
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  createdAt: number;
};

export async function saveGoogleOAuthPending(data: Omit<GoogleOAuthPending, 'createdAt'>) {
  const payload: GoogleOAuthPending = { ...data, createdAt: Date.now() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function loadGoogleOAuthPending(): Promise<GoogleOAuthPending | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoogleOAuthPending;
    if (!parsed.clientId || !parsed.redirectUri || !parsed.codeVerifier) return null;
    // 15 dk'dan eski pending gecersiz.
    if (Date.now() - (parsed.createdAt ?? 0) > 15 * 60 * 1000) {
      await clearGoogleOAuthPending();
      return null;
    }
    return parsed;
  } catch {
    await clearGoogleOAuthPending();
    return null;
  }
}

export async function clearGoogleOAuthPending() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
