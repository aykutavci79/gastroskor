'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { setBackendAccessToken } from '@/lib/backend-auth-token';

type SessionWithBackendToken = {
  backendAccessToken?: string | null;
};

export function BackendAuthBridge() {
  const { data: session } = useSession();

  useEffect(() => {
    const token = (session as SessionWithBackendToken | null)?.backendAccessToken ?? null;
    setBackendAccessToken(token);
  }, [session]);

  return null;
}
