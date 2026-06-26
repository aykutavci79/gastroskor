import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr';

type BackendTokenPair = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

async function exchangeGoogleIdToken(idToken: string, kvkkConsentAccepted: boolean) {
  const response = await fetch(`${API_BASE}/api/v1/auth/google/web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken, kvkk_consent_accepted: kvkkConsentAccepted }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Backend oturum acilamadi (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  return response.json() as Promise<BackendTokenPair>;
}

export async function refreshBackendAccessToken(refreshToken: string) {
  const response = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Backend oturum yenilenemedi (${response.status})`);
  }
  return response.json() as Promise<BackendTokenPair>;
}

function applyBackendTokens(
  token: import('next-auth/jwt').JWT,
  backend: BackendTokenPair,
) {
  token.backendAccessToken = backend.access_token;
  token.backendRefreshToken = backend.refresh_token;
  token.backendTokenExpiresAt = Date.now() + backend.expires_in * 1000;
  token.backendExchangeError = undefined;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.provider === 'google') {
        token.sub = profile?.sub ?? token.sub;
      }
      if (account?.id_token) {
        try {
          // Giris sayfasinda KVKK zorunlu; OAuth callback'te cookie bazen gelmez.
          const backend = await exchangeGoogleIdToken(account.id_token, true);
          applyBackendTokens(token, backend);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Backend oturum acilamadi.';
          console.error('Backend token exchange failed', message);
          token.backendExchangeError = message;
        }
      } else if (
        typeof token.backendRefreshToken === 'string' &&
        token.backendRefreshToken.trim() &&
        typeof token.backendTokenExpiresAt === 'number' &&
        Date.now() >= token.backendTokenExpiresAt - 60_000
      ) {
        try {
          const backend = await refreshBackendAccessToken(token.backendRefreshToken);
          applyBackendTokens(token, backend);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Backend oturum yenilenemedi.';
          console.error('Backend token refresh failed', message);
          token.backendExchangeError = message;
          token.backendAccessToken = undefined;
        }
      }
      return token;
    },
    async signIn() {
      return true;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
        backendAccessToken: token.backendAccessToken,
        backendExchangeError: token.backendExchangeError,
      };
    },
  },
  pages: {
    signIn: '/auth/giris',
    error: '/auth/giris',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
