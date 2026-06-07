import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/context/session-context';
import {
  isPushNotificationsSupported,
  parseNotificationOpenPath,
  registerUserPushToken,
} from '@/lib/push-notifications';
import { readPushNotificationsEnabled } from '@/lib/push-preference';

export function NotificationBootstrap() {
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    if (!isPushNotificationsSupported() || !user?.email) return;
    void readPushNotificationsEnabled().then((enabled) => {
      if (enabled) void registerUserPushToken(user.email);
    });
  }, [user?.email]);

  useEffect(() => {
    if (!isPushNotificationsSupported()) return;

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void import('expo-notifications').then((Notifications) => {
      if (cancelled) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const path = parseNotificationOpenPath(response.notification.request.content.data);
        if (path) {
          router.push(path as never);
        }
      });
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);

  return null;
}
