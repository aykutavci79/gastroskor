'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

import { BackendAuthBridge } from '@/components/BackendAuthBridge';
import { WebMetricsTracker } from '@/components/WebMetricsTracker';
import { CityProvider } from '@/context/city-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const SessionProviderCompat = SessionProvider as unknown as React.ComponentType<{ children: React.ReactNode }>;

  return (
    <SessionProviderCompat>
      <CityProvider>
        <BackendAuthBridge />
        <WebMetricsTracker />
        {children}
        <Toaster richColors position="top-right" />
      </CityProvider>
    </SessionProviderCompat>
  );
}
