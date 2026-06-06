import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { registerPushToken } from '@/lib/api';

type NotificationsModule = typeof import('expo-notifications');

/** SDK 53+: uzak push Expo Go'da desteklenmiyor (dev/EAS build gerekir). */
export function isPushNotificationsSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

let handlerConfigured = false;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!isPushNotificationsSupported()) return null;
  return import('expo-notifications');
}

async function ensureNotificationHandler(): Promise<NotificationsModule | null> {
  const Notifications = await loadNotifications();
  if (!Notifications || handlerConfigured) return Notifications;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  return Notifications;
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  const Notifications = await ensureNotificationHandler();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function registerUserPushToken(userEmail: string): Promise<void> {
  if (!isPushNotificationsSupported() || !userEmail.trim()) return;

  const allowed = await ensureNotificationPermissions();
  if (!allowed) return;

  try {
    const Notifications = await ensureNotificationHandler();
    if (!Notifications) return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId: String(projectId) } : undefined,
    );
    const token = tokenResponse.data?.trim();
    if (!token) return;
    await registerPushToken({
      user_email: userEmail.trim().toLowerCase(),
      expo_push_token: token,
      platform: Platform.OS,
    });
  } catch {
    /* izin yok veya cihaz desteklemiyor */
  }
}

export function parseNotificationOpenPath(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const openPath = (data as { open_path?: string }).open_path;
  return typeof openPath === 'string' && openPath.startsWith('/') ? openPath : null;
}
