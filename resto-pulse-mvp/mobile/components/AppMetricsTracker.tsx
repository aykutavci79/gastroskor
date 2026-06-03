import { useEffect } from 'react';

import { setAppMetricsUserId, startAppMetrics, stopAppMetrics } from '@/lib/app-metrics';
import { useSession } from '@/context/session-context';

export function AppMetricsTracker() {
  const { user } = useSession();

  useEffect(() => {
    setAppMetricsUserId(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    startAppMetrics();
    return () => stopAppMetrics();
  }, []);

  return null;
}
