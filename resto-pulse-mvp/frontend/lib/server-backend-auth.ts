import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth-options';

type SessionWithBackendToken = {
  backendAccessToken?: string | null;
};

export async function backendAuthHeadersFromSession(): Promise<Record<string, string>> {
  const session = (await getServerSession(authOptions)) as SessionWithBackendToken | null;
  const token = session?.backendAccessToken?.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
