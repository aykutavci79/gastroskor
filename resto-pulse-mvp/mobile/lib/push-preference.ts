import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gastroskor.push.enabled.v1';

export async function readPushNotificationsEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === 'false') return false;
  return true;
}

export async function writePushNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
}
