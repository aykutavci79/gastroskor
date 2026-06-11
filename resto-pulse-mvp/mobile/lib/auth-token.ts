import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'gastroskor.auth.access-token.v1';

let accessToken: string | null = null;

export function getAccessToken() {
  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token?.trim() ? token.trim() : null;
  if (accessToken) {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    return;
  }
  await clearAccessToken();
}

export async function loadAccessToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    accessToken = stored?.trim() ? stored.trim() : null;
  } catch {
    accessToken = null;
  }
  return accessToken;
}

export async function clearAccessToken(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* Keychain erisimi yoksa sessizce gec */
  }
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
