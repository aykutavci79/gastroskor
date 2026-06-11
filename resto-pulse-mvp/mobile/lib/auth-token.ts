import * as SecureStore from 'expo-secure-store';

import { getApiV1Base } from '@/lib/api-base';

const TOKEN_KEY = 'gastroskor.auth.access-token.v1';
const REFRESH_TOKEN_KEY = 'gastroskor.auth.refresh-token.v1';

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

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

export async function setRefreshToken(token: string | null): Promise<void> {
  const normalized = token?.trim() ? token.trim() : null;
  if (normalized) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, normalized);
    return;
  }
  await clearRefreshToken();
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

export async function loadRefreshToken(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    return stored?.trim() ? stored.trim() : null;
  } catch {
    return null;
  }
}

export async function clearAccessToken(): Promise<void> {
  accessToken = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* Keychain erisimi yoksa sessizce gec */
  }
}

export async function clearRefreshToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {
    /* Keychain erisimi yoksa sessizce gec */
  }
}

export async function clearAllAuthTokens(): Promise<void> {
  await clearAccessToken();
  await clearRefreshToken();
}

export async function persistAuthTokens(tokens: {
  access_token: string;
  refresh_token: string;
}): Promise<void> {
  await setAccessToken(tokens.access_token);
  await setRefreshToken(tokens.refresh_token);
}

export function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function refreshAuthTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await loadRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${getApiV1Base()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!response.ok) return false;

      const data = (await response.json()) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!data.access_token?.trim() || !data.refresh_token?.trim()) return false;

      await persistAuthTokens({
        access_token: data.access_token.trim(),
        refresh_token: data.refresh_token.trim(),
      });
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
