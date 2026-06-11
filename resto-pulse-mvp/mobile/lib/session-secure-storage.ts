import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { loadAccessToken } from '@/lib/auth-token';

const SESSION_KEY = 'gastroskor.session.v1';
const LEGACY_ASYNC_KEY = 'gastroskor.session.v1';

export type StoredSessionUser = {
  id?: string | null;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  nickname?: string | null;
  needsNicknameSetup?: boolean;
  googleSub?: string | null;
  authMethod: 'google';
};

type LegacySessionPayload = StoredSessionUser & { accessToken?: string | null };

function stripToken(payload: LegacySessionPayload): StoredSessionUser {
  const { accessToken: _token, ...user } = payload;
  return user;
}

async function migrateFromAsyncStorage(): Promise<LegacySessionPayload | null> {
  const legacyRaw = await AsyncStorage.getItem(LEGACY_ASYNC_KEY);
  if (!legacyRaw) return null;

  let parsed: LegacySessionPayload;
  try {
    parsed = JSON.parse(legacyRaw) as LegacySessionPayload;
  } catch {
    await AsyncStorage.removeItem(LEGACY_ASYNC_KEY);
    return null;
  }

  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(stripToken(parsed)));
  await AsyncStorage.removeItem(LEGACY_ASYNC_KEY);
  return parsed;
}

export async function readStoredSession(): Promise<{
  user: StoredSessionUser;
  accessToken: string | null;
} | null> {
  const migrated = await migrateFromAsyncStorage();
  if (migrated?.email && migrated.authMethod === 'google' && migrated.googleSub) {
    const accessToken =
      migrated.accessToken?.trim() ? migrated.accessToken.trim() : await loadAccessToken();
    return {
      user: stripToken(migrated),
      accessToken,
    };
  }

  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LegacySessionPayload;
    if (!parsed?.email || parsed.authMethod !== 'google' || !parsed.googleSub) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      return null;
    }
    const accessToken =
      parsed.accessToken?.trim() ? parsed.accessToken.trim() : await loadAccessToken();
    return {
      user: stripToken(parsed),
      accessToken,
    };
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
}

export async function writeStoredSession(user: StoredSessionUser): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(user));
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
  await AsyncStorage.removeItem(LEGACY_ASYNC_KEY);
}
