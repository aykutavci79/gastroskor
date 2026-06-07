import Constants, { ExecutionEnvironment } from 'expo-constants';

function readClientId(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export const webClientId = readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
export const iosClientId = readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function isGoogleSignInConfigured(): boolean {
  return Boolean(webClientId);
}

export function getGoogleSignInSetupHint(): string | null {
  if (isExpoGo) {
    return 'Google girisi Expo Go\'da calismaz. Play dahili test / EAS build kullanin.';
  }
  if (!webClientId) {
    return 'EAS production env: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (Web client) gerekli.';
  }
  return null;
}
