import { useEffect } from 'react';

import { setAppMetricsUserId, startAppMetrics, stopAppMetrics } from '@/lib/app-metrics';
import { useSession } from '@/context/session-context';
import { useGastroPostHog } from '@/lib/gastro-posthog';

export function AppMetricsTracker() {
  const { user } = useSession();
  const posthog = useGastroPostHog();

  useEffect(() => {
    setAppMetricsUserId(user?.id ?? null);
    if (user?.id) {
      posthog.identify(String(user.id), {
        email: user.email,
        nickname: user.nickname ?? undefined,
      });
      return;
    }
    posthog.reset();
  }, [user?.id, user?.email, user?.nickname, posthog]);

  useEffect(() => {
    startAppMetrics();
    return () => stopAppMetrics();
  }, []);

  return null;
}
