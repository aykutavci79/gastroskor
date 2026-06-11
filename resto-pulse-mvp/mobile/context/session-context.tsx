import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { syncUser } from '@/lib/api';
import { setAuthFailureHandler } from '@/lib/auth-session-events';
import {
  clearAllAuthTokens,
  loadRefreshToken,
  persistAuthTokens,
  setAccessToken,
} from '@/lib/auth-token';
import { signOutGoogleNative } from '@/lib/google-signin-native';
import { registerUserPushToken } from '@/lib/push-notifications';
import {
  clearStoredSession,
  readStoredSession,
  type StoredSessionUser,
  writeStoredSession,
} from '@/lib/session-secure-storage';
import type { UserProfile } from '@/lib/types';

export type SessionUser = StoredSessionUser & {
  accessToken?: string | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signInWithGoogleProfile: (
    profile: UserProfile,
    googleSub?: string | null,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => Promise<void>;
  applyProfile: (profile: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function profileToSession(
  email: string,
  profile: UserProfile,
  googleSub?: string | null,
  accessToken?: string | null,
): SessionUser {
  return {
    id: profile.id,
    email: email.trim().toLowerCase(),
    fullName: profile.full_name ?? null,
    avatarUrl: profile.avatar_url,
    avatarPreset: profile.avatar_preset ?? null,
    nickname: profile.nickname ?? null,
    needsNicknameSetup: profile.needs_nickname_setup ?? !profile.nickname,
    googleSub: googleSub ?? null,
    accessToken: accessToken ?? null,
    authMethod: 'google',
  };
}

async function persistUser(user: SessionUser, refreshToken: string | null) {
  if (user.accessToken && refreshToken) {
    await persistAuthTokens({
      access_token: user.accessToken,
      refresh_token: refreshToken,
    });
  } else if (user.accessToken) {
    await setAccessToken(user.accessToken);
  }
  const { accessToken: _token, ...stored } = user;
  await writeStoredSession(stored);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshTokenState] = useState<string | null>(null);

  const forceLogout = useCallback(async () => {
    await signOutGoogleNative().catch(() => undefined);
    await clearAllAuthTokens();
    await clearStoredSession();
    setRefreshTokenState(null);
    setUser(null);
    router.replace('/(tabs)/profil');
  }, []);

  const applyProfile = useCallback(async (profile: UserProfile) => {
    const email = profile.email.trim().toLowerCase();
    if (!user?.googleSub) return;
    const next = profileToSession(email, profile, user.googleSub, user.accessToken);
    await persistUser(next, refreshToken);
    setUser(next);
  }, [user?.googleSub, user?.accessToken, refreshToken]);

  const refreshProfile = useCallback(async () => {
    if (!user?.email || !user.googleSub) return;
    const profile = await syncUser({
      email: user.email,
      full_name: user.fullName ?? null,
      google_sub: user.googleSub,
    });
    const next = profileToSession(user.email, profile, user.googleSub, user.accessToken);
    await persistUser(next, refreshToken);
    setUser(next);
  }, [user, refreshToken]);

  React.useEffect(() => {
    setAuthFailureHandler(forceLogout);
    return () => setAuthFailureHandler(null);
  }, [forceLogout]);

  React.useEffect(() => {
    readStoredSession()
      .then(async (stored) => {
        if (!stored) return;
        const { user: storedUser, accessToken } = stored;
        if (!accessToken) {
          await clearAllAuthTokens();
          await clearStoredSession();
          return;
        }
        const storedRefresh = await loadRefreshToken();
        if (storedRefresh) {
          setRefreshTokenState(storedRefresh);
        }
        const parsed: SessionUser = { ...storedUser, accessToken };
        try {
          const profile = await syncUser({
            email: parsed.email,
            full_name: parsed.fullName ?? null,
            google_sub: parsed.googleSub!,
          });
          const next = profileToSession(parsed.email, profile, parsed.googleSub, parsed.accessToken);
          await persistUser(next, storedRefresh);
          setUser(next);
          void registerUserPushToken(next.email);
        } catch {
          setUser(parsed);
          void registerUserPushToken(parsed.email);
        }
      })
      .catch(() => {
        /* SecureStore veya ag hatasi — uygulama acilsin */
      })
      .finally(() => setLoading(false));
  }, [forceLogout]);

  const signInWithGoogleProfile = useCallback(async (
    profile: UserProfile,
    googleSub?: string | null,
    accessToken?: string | null,
    nextRefreshToken?: string | null,
  ) => {
    const email = profile.email.trim().toLowerCase();
    const next = profileToSession(email, profile, googleSub ?? 'google', accessToken ?? null);
    const refresh = nextRefreshToken?.trim() ? nextRefreshToken.trim() : null;
    if (!refresh) {
      throw new Error('Oturum yenileme bilgisi alinamadi.');
    }
    setRefreshTokenState(refresh);
    await persistUser(next, refresh);
    setUser(next);
    void registerUserPushToken(email);
  }, []);

  const signOut = useCallback(async () => {
    await forceLogout();
  }, [forceLogout]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogleProfile,
      applyProfile,
      signOut,
      refreshProfile,
    }),
    [user, loading, signInWithGoogleProfile, applyProfile, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
