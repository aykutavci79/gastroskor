import { getToken } from 'next-auth/jwt';
import { cookies } from 'next/headers';

import { refreshBackendAccessToken } from '@/lib/auth-options';

export async function backendAuthHeadersFromSession(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const token = await getToken({
    req: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
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
