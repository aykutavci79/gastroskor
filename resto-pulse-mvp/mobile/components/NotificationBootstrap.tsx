import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/context/session-context';
import { parseNotificationOpenPath, registerUserPushToken } from '@/lib/push-notifications';

export function NotificationBootstrap() {
  const router = useRouter();
  const { user } = useSession();

  useEffect(() => {
    if (!user?.email) return;
    void registerUserPushToken(user.email);
  }, [user?.email]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = parseNotificationOpenPath(response.notification.request.content.data);
      if (path) {
        router.push(path as never);
      }
    });
    return () => sub.remove();
  }, [router]);

  return null;
}
