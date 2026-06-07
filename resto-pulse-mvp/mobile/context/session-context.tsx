import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { syncUser } from '@/lib/api';
import { signOutGoogleNative } from '@/lib/google-signin-native';
import { registerUserPushToken } from '@/lib/push-notifications';
import type { UserProfile } from '@/lib/types';

const STORAGE_KEY = 'gastroskor.session.v1';

export type SessionUser = {
  id?: string | null;
  email: string;
  fullName: string | null;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  nickname?: string | null;
  needsNicknameSetup?: boolean;
  googleSub?: string | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signInWithGoogleProfile: (profile: UserProfile) => Promise<void>;
  signInWithEmail: (email: string, fullName?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function profileToSession(email: string, profile: UserProfile, googleSub?: string | null): SessionUser {
  return {
    id: profile.id,
    email: email.trim().toLowerCase(),
    fullName: profile.full_name ?? null,
    avatarUrl: profile.avatar_url,
    avatarPreset: profile.avatar_preset ?? null,
    nickname: profile.nickname ?? null,
    needsNicknameSetup: profile.needs_nickname_setup ?? !profile.nickname,
    googleSub: googleSub ?? null,
  };
}

async function persistUser(user: SessionUser) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user?.email) return;
    const profile = await syncUser({
      email: user.email,
      full_name: user.fullName ?? null,
      avatar_url: user.avatarUrl ?? null,
      google_sub: user.googleSub ?? null,
    });
    const next = profileToSession(user.email, profile, user.googleSub);
    await persistUser(next);
    setUser(next);
  }, [user]);

  React.useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(async (raw) => {
        if (!raw) return;
        let parsed: SessionUser;
        try {
          parsed = JSON.parse(raw) as SessionUser;
        } catch {
          await AsyncStorage.removeItem(STORAGE_KEY);
          return;
        }
        if (!parsed?.email) return;
        try {
          const profile = await syncUser({
            email: parsed.email,
            full_name: parsed.fullName ?? null,
            avatar_url: parsed.avatarUrl ?? null,
            google_sub: parsed.googleSub ?? null,
          });
          const next = profileToSession(parsed.email, profile, parsed.googleSub);
          await persistUser(next);
          setUser(next);
          void registerUserPushToken(next.email);
        } catch {
          setUser(parsed);
          void registerUserPushToken(parsed.email);
        }
      })
      .catch(() => {
        /* AsyncStorage veya ag hatasi — uygulama acilsin */
      })
      .finally(() => setLoading(false));
  }, []);

  const signInWithGoogleProfile = useCallback(async (profile: UserProfile) => {
    const email = profile.email.trim().toLowerCase();
    const next = profileToSession(email, profile);
    await persistUser(next);
    setUser(next);
    void registerUserPushToken(email);
  }, []);

  const signInWithEmail = useCallback(async (email: string, fullName?: string | null) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new Error('Gecerli bir e-posta girin.');
    }
    const profile = await syncUser({ email: normalized, full_name: fullName ?? null, record_login: true });
    const next = profileToSession(normalized, profile);
    await persistUser(next);
    setUser(next);
    void registerUserPushToken(normalized);
  }, []);

  const signOut = useCallback(async () => {
    await signOutGoogleNative();
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogleProfile, signInWithEmail, signOut, refreshProfile }),
    [user, loading, signInWithGoogleProfile, signInWithEmail, signOut, refreshProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
