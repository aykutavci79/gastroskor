import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';
import type { IncomingMessage } from 'http';

import { refreshBackendAccessToken } from '@/lib/auth-options';

type TokenRequest = IncomingMessage & {
  cookies: Partial<{ [key: string]: string }>;
};

async function tokenRequestFromCookies(): Promise<TokenRequest> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const cookieMap = Object.fromEntries(
    cookieStore.getAll().map((row) => [row.name, row.value]),
  );
  return {
    headers: { cookie: cookieHeader },
    cookies: cookieMap,
  } as TokenRequest;
}

export async function backendAuthHeadersFromSession(): Promise<Record<string, string>> {
  const token = await getToken({
    req: await tokenRequestFromCookies(),
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return {};
  }

  let accessToken =
    typeof token.backendAccessToken === 'string' ? token.backendAccessToken.trim() : '';
  const refreshToken =
    typeof token.backendRefreshToken === 'string' ? token.backendRefreshToken.trim() : '';
  const expiresAt =
    typeof token.backendTokenExpiresAt === 'number' ? token.backendTokenExpiresAt : 0;
  const needsRefresh =
    !accessToken || (expiresAt > 0 && Date.now() >= expiresAt - 60_000);

  if (needsRefresh && refreshToken) {
    try {
      const backend = await refreshBackendAccessToken(refreshToken);
      accessToken = backend.access_token.trim();
    } catch {
      return {};
    }
  }

  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}
