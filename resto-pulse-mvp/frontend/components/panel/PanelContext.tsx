'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';

import { getPanelAccess, syncUser } from '@/lib/api';
import type { PanelAccess } from '@/lib/types';

type PanelContextValue = {
  access: PanelAccess | null;
  loading: boolean;
  error: string | null;
  userEmail: string | null;
  refresh: () => Promise<void>;
};

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [access, setAccess] = useState<PanelAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userEmail = session?.user?.email ?? null;

  const refresh = useCallback(async () => {
    if (!userEmail) {
      setAccess(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await syncUser({
        email: userEmail,
        full_name: session?.user?.name ?? null,
        avatar_url: session?.user?.image ?? null,
        google_sub: (session?.user as { id?: string } | undefined)?.id ?? null,
      });
      const data = await getPanelAccess(userEmail);
      setAccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Panel yuklenemedi');
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user, userEmail]);

  useEffect(() => {
    if (status === 'loading') return;
    void refresh();
  }, [status, refresh]);

  const value = useMemo(
    () => ({ access, loading, error, userEmail, refresh }),
    [access, loading, error, userEmail, refresh],
  );

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) {
    throw new Error('usePanel must be used within PanelProvider');
  }
  return ctx;
}
