import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { syncUser } from '@/lib/api';
import { getApiV1Base } from '@/lib/api-base';
import { ensureSslPinningReady } from '@/lib/ssl-pinning';
import { setAuthFailureHandler } from '@/lib/auth-session-events';
import {
  clearAllAuthTokens,
  loadAccessToken,
  loadRefreshToken,
  persistAuthTokens,
  setAccessToken,
} from '@/lib/auth-token';
import { signOutGoogleNative } from '@/lib/google-signin-native';
import { registerUserPushToken } from '@/lib/push-notifications';
import {
  clearStoredSession,
  readStoredSession,
  type AuthMethod,
  type StoredSessionUser,
  writeStoredSession,
} from '@/lib/session-secure-storage';
import { clearStoredOrderContact } from '@/lib/order-contact-secure-storage';
import type { UserProfile } from '@/lib/types';

export type SessionUser = StoredSessionUser & {
  accessToken?: string | null;
};

type AuthIdentity = {
  authMethod: AuthMethod;
  googleSub?: string | null;
  appleSub?: string | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signInWithAuthProfile: (
    profile: UserProfile,
    identity: AuthIdentity,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => Promise<void>;
  /** @deprecated use signInWithAuthProfile */
  signInWithGoogleProfile: (
    profile: UserProfile,
    googleSub?: string | null,
    accessToken?: string | null,
    refreshToken?: string | null,
  ) => Promise<void>;
  applyProfile: (profile: UserProfile) => Promise<void>;
  signOut: () => Promise<void>;
  clearLocalSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function profileToSession(
  email: string,
  profile: UserProfile,
  identity: AuthIdentity,
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
    googleSub: identity.googleSub ?? profile.google_sub ?? null,
    appleSub: identity.appleSub ?? profile.apple_sub ?? null,
    authMethod: identity.authMethod,
    accessToken: accessToken ?? null,
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
    await clearStoredOrderContact();
    setRefreshTokenState(null);
    setUser(null);
    router.replace('/(tabs)/profil');
  }, []);

  const applyProfile = useCallback(async (profile: UserProfile) => {
    if (!user) return;
    const next = profileToSession(
      user.email,
      profile,
      {
        authMethod: user.authMethod,
        googleSub: user.googleSub,
        appleSub: user.appleSub,
      },
      user.accessToken,
    );
    await persistUser(next, refreshToken);
    setUser(next);
  }, [user, refreshToken]);

  const refreshProfile = useCallback(async () => {
    if (!user?.email) return;
    const profile = await syncUser({
      email: user.email,
      full_name: user.fullName ?? null,
      google_sub: user.authMethod === 'google' ? user.googleSub ?? null : null,
      apple_sub: user.authMethod === 'apple' ? user.appleSub ?? null : null,
    });
    const next = profileToSession(
      user.email,
      profile,
      {
        authMethod: user.authMethod,
        googleSub: profile.google_sub ?? user.googleSub ?? null,
        appleSub: profile.apple_sub ?? user.appleSub ?? null,
      },
      user.accessToken,
    );
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
            google_sub: parsed.authMethod === 'google' ? parsed.googleSub ?? null : null,
            apple_sub: parsed.authMethod === 'apple' ? parsed.appleSub ?? null : null,
          });
          const next = profileToSession(parsed.email, profile, {
            authMethod: parsed.authMethod,
            googleSub: profile.google_sub ?? parsed.googleSub ?? null,
            appleSub: profile.apple_sub ?? parsed.appleSub ?? null,
          }, parsed.accessToken);
          await persistUser(next, storedRefresh);
          setUser(next);
          void registerUserPushToken(next.email);
        } catch {
          await loadAccessToken();
          setUser(parsed);
          void registerUserPushToken(parsed.email);
        }
      })
      .catch(() => {
        /* SecureStore veya ag hatasi — uygulama acilsin */
      })
      .finally(() => setLoading(false));
  }, [forceLogout]);

  const signInWithAuthProfile = useCallback(async (
    profile: UserProfile,
    identity: AuthIdentity,
    accessToken?: string | null,
    nextRefreshToken?: string | null,
  ) => {
    const email = profile.email.trim().toLowerCase();
    const next = profileToSession(
      email,
      profile,
      {
        authMethod: identity.authMethod,
        googleSub: identity.googleSub ?? profile.google_sub ?? null,
        appleSub: identity.appleSub ?? profile.apple_sub ?? null,
      },
      accessToken ?? null,
    );
    const refresh = nextRefreshToken?.trim() ? nextRefreshToken.trim() : null;
    if (!refresh) {
      throw new Error('Oturum yenileme bilgisi alinamadi.');
    }
    setRefreshTokenState(refresh);
    await persistUser(next, refresh);
    setUser(next);
    void registerUserPushToken(email);
  }, []);

  const signInWithGoogleProfile = useCallback(async (
    profile: UserProfile,
    googleSub?: string | null,
    accessToken?: string | null,
    nextRefreshToken?: string | null,
  ) => {
    await signInWithAuthProfile(
      profile,
      { authMethod: 'google', googleSub: googleSub ?? profile.google_sub ?? null },
      accessToken,
      nextRefreshToken,
    );
  }, [signInWithAuthProfile]);

  const signOut = useCallback(async () => {
    const token = refreshToken ?? (await loadRefreshToken());
    if (token) {
      try {
        await ensureSslPinningReady();
        await fetch(`${getApiV1Base()}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: token }),
        });
      } catch {
        /* Ag hatasi — yerel cikis devam eder */
      }
    }
    await forceLogout();
  }, [forceLogout, refreshToken]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signInWithAuthProfile,
      signInWithGoogleProfile,
      applyProfile,
      signOut,
      clearLocalSession: forceLogout,
      refreshProfile,
    }),
    [user, loading, signInWithAuthProfile, signInWithGoogleProfile, applyProfile, signOut, forceLogout, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
