import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { syncUser } from '@/lib/api';

const STORAGE_KEY = 'gastroskor.session.v1';

export type SessionUser = {
  email: string;
  fullName: string | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signInWithEmail: (email: string, fullName?: string | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as SessionUser;
        if (parsed?.email) setUser(parsed);
      })
      .finally(() => setLoading(false));
  }, []);

  const signInWithEmail = useCallback(async (email: string, fullName?: string | null) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      throw new Error('Gecerli bir e-posta girin (web panelindeki Google hesabi).');
    }
    await syncUser({ email: normalized, full_name: fullName ?? null });
    const next: SessionUser = { email: normalized, fullName: fullName ?? null };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setUser(next);
  }, []);

  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithEmail, signOut }),
    [user, loading, signInWithEmail, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
