'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { BackendAuthBridge } from '@/components/BackendAuthBridge';
import { WebMetricsTracker } from '@/components/WebMetricsTracker';
import { CityProvider } from '@/context/city-context';

export function Providers({ children }: { children: React.ReactNode }) {
  const SessionProviderCompat = SessionProvider as unknown as React.ComponentType<{ children: React.ReactNode }>;

  return (
    <SessionProviderCompat>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="gastroskor-theme">
        <CityProvider>
          <BackendAuthBridge />
          <WebMetricsTracker />
          {children}
          <Toaster richColors position="top-right" />
        </CityProvider>
      </ThemeProvider>
    </SessionProviderCompat>
  );
}
