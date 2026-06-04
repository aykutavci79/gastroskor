import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from '@/lib/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function registerUserPushToken(userEmail: string): Promise<void> {
  if (!userEmail.trim()) return;
  const allowed = await ensureNotificationPermissions();
  if (!allowed) return;

  try {
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
    /* Expo Go veya izin yok — sessiz */
  }
}

export function parseNotificationOpenPath(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const openPath = (data as { open_path?: string }).open_path;
  return typeof openPath === 'string' && openPath.startsWith('/') ? openPath : null;
}
