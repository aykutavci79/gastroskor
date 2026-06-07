/** Android OAuth client ID -> reverse scheme (manifest intent filter ile ayni). */
export function getGoogleAndroidOAuthScheme(androidClientId: string): string {
  const prefix = androidClientId.trim().replace(/\.apps\.googleusercontent\.com$/i, '');
  return `com.googleusercontent.apps.${prefix}`;
}

/**
 * Play build: Google Android client yalnizca bu redirect URI'yi kabul eder.
 * gastroskor://oauth2redirect Web client icindir; Android client'ta 400 invalid_request verir.
 */
export function getGoogleAndroidRedirectUri(androidClientId: string): string {
  return `${getGoogleAndroidOAuthScheme(androidClientId)}:/oauth2redirect`;
}
