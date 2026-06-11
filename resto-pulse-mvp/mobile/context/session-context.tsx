import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { syncUser } from '@/lib/api';
import { clearAccessToken, setAccessToken } from '@/lib/auth-token';
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
  signInWithGoogleProfile: (profile: UserProfile, googleSub?: string | null, accessToken?: string | null) => Promise<void>;
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

async function persistUser(user: SessionUser) {
  await setAccessToken(user.accessToken ?? null);
  const { accessToken: _token, ...stored } = user;
  await writeStoredSession(stored);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = useCallback(async (profile: UserProfile) => {
    const email = profile.email.trim().toLowerCase();
    if (!user?.googleSub) return;
    const next = profileToSession(email, profile, user.googleSub, user.accessToken);
    await persistUser(next);
    setUser(next);
  }, [user?.googleSub, user?.accessToken]);

  const refreshProfile = useCallback(async () => {
    if (!user?.email || !user.googleSub) return;
    const profile = await syncUser({
      email: user.email,
      full_name: user.fullName ?? null,
      google_sub: user.googleSub,
    });
    const next = profileToSession(user.email, profile, user.googleSub, user.accessToken);
    await persistUser(next);
    setUser(next);
  }, [user]);

  React.useEffect(() => {
    readStoredSession()
      .then(async (stored) => {
        if (!stored) return;
        const { user: storedUser, accessToken } = stored;
        if (!accessToken) {
          await clearStoredSession();
          await clearAccessToken();
          return;
        }
        await setAccessToken(accessToken);
        const parsed: SessionUser = { ...storedUser, accessToken };
        try {
          const profile = await syncUser({
            email: parsed.email,
            full_name: parsed.fullName ?? null,
            google_sub: parsed.googleSub!,
          });
          const next = profileToSession(parsed.email, profile, parsed.googleSub, parsed.accessToken);
          await persistUser(next);
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
  }, []);

  const signInWithGoogleProfile = useCallback(async (
    profile: UserProfile,
    googleSub?: string | null,
    accessToken?: string | null,
  ) => {
    const email = profile.email.trim().toLowerCase();
    const next = profileToSession(email, profile, googleSub ?? 'google', accessToken ?? null);
    await persistUser(next);
    setUser(next);
    void registerUserPushToken(email);
  }, []);

  const signOut = useCallback(async () => {
    await signOutGoogleNative();
    await clearAccessToken();
    await clearStoredSession();
    setUser(null);
  }, []);

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
