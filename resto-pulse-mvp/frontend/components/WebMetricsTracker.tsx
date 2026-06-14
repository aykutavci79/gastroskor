'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { setWebMetricsUserId, startWebMetrics, stopWebMetrics } from '@/lib/web-metrics';

function isPublicSitePath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/panel')) return false;
  if (pathname.startsWith('/api')) return false;
  return true;
}

export function WebMetricsTracker() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const track = isPublicSitePath(pathname);

  useEffect(() => {
    setWebMetricsUserId(session?.user?.id ?? null);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!track) {
      stopWebMetrics();
      return;
    }
    startWebMetrics();
    return () => stopWebMetrics();
  }, [track]);

  return null;
}
