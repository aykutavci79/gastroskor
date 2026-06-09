import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

function readClientId(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readExtraClientId(key: string) {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  return readClientId(extra?.[key]);
}

export const webClientId =
  readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ?? readExtraClientId('googleWebClientId');
export const iosClientId =
  readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) ?? readExtraClientId('googleIosClientId');

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function isGoogleSignInConfigured(): boolean {
  if (!webClientId) return false;
  if (Platform.OS === 'ios' && !iosClientId) return false;
  return true;
}

export function getGoogleSignInSetupHint(): string | null {
  if (isExpoGo) {
    return 'Google girisi Expo Go\'da calismaz. Play dahili test / EAS build kullanin.';
  }
  if (!webClientId) {
    return 'EAS production env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Web client) gerekli.';
  }
  if (Platform.OS === 'ios' && !iosClientId) {
    return (
      'iOS TestFlight icin EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID tanimli olmali. ' +
      'Google Cloud > OAuth > iOS client (com.gastroskor.app) olusturup EAS production env\'e ekle; yeni iOS build al.'
    );
  }
  return null;
}
