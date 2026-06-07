import * as AuthSession from 'expo-auth-session';

import type { GoogleOAuthPending } from '@/lib/google-oauth-pending';

const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

/** Android native OAuth: authorization code -> id_token (Play build cold-start icin). */
export async function exchangeGoogleAuthCode(code: string, pending: GoogleOAuthPending): Promise<string> {
  const exchangeRequest = new AuthSession.AccessTokenRequest({
    clientId: pending.clientId,
    redirectUri: pending.redirectUri,
    code: code.trim(),
    extraParams: {
      code_verifier: pending.codeVerifier,
    },
  });

  const result = await exchangeRequest.performAsync(GOOGLE_DISCOVERY);
  const idToken = result.idToken?.trim();
  if (!idToken) {
    throw new Error('Google oturum jetonu alinamadi (token exchange).');
  }
  return idToken;
}
