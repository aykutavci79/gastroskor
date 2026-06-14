'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

import { BackendAuthBridge } from '@/components/BackendAuthBridge';
import { WebMetricsTracker } from '@/components/WebMetricsTracker';

export function Providers({ children }: { children: React.ReactNode }) {
  const SessionProviderCompat = SessionProvider as unknown as React.ComponentType<{ children: React.ReactNode }>;

  return (
    <SessionProviderCompat>
      <BackendAuthBridge />
      <WebMetricsTracker />
      {children}
      <Toaster richColors position="top-right" />
    </SessionProviderCompat>
  );
}
