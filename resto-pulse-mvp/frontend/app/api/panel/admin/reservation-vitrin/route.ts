import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function adminHeaders(secret: string | undefined) {
  const headers: Record<string, string> = {};
  if (secret) headers['X-Panel-Admin-Secret'] = secret;
  return headers;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({ detail: 'Admin yetkisi yok.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = url.searchParams.get('limit') ?? '100';
  const query = new URLSearchParams({ user_email: email, limit });
  if (status) query.set('status', status);

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  const response = await fetch(`${API_BASE}/api/v1/panel/admin/reservation-vitrin?${query}`, {
    headers: { ...adminHeaders(secret), ...(await backendAuthHeadersFromSession()) },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
