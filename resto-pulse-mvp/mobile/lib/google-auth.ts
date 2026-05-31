export type GoogleIdTokenClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export function parseGoogleIdToken(idToken: string): GoogleIdTokenClaims {
  const parts = idToken.split('.');
  if (parts.length < 2) {
    throw new Error('Gecersiz Google oturum bilgisi.');
  }
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
  const json = globalThis.atob(padded);
  const data = JSON.parse(json) as GoogleIdTokenClaims;
  if (!data.sub) {
    throw new Error('Google hesap kimligi alinamadi.');
  }
  return data;
}
