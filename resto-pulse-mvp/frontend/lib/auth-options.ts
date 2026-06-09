import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr';

async function exchangeGoogleIdToken(idToken: string) {
  const response = await fetch(`${API_BASE}/api/v1/auth/google/web`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Backend oturum acilamadi (${response.status})`);
  }
  return response.json() as Promise<{ access_token: string; expires_in: number }>;
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
          const backend = await exchangeGoogleIdToken(account.id_token);
          token.backendAccessToken = backend.access_token;
          token.backendTokenExpiresAt = Date.now() + backend.expires_in * 1000;
        } catch (error) {
          console.error('Backend token exchange failed', error);
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
