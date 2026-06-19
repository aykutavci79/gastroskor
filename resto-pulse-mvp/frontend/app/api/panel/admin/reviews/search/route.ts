import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({ detail: 'Admin yetkisi yok.' }, { status: 403 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  const search = request.nextUrl.searchParams.toString();
  const response = await fetch(
    `${API_BASE}/api/v1/panel/admin/reviews/search${search ? `?${search}` : ''}`,
    {
      headers: { ...adminHeaders(secret), ...(await backendAuthHeadersFromSession()) },
      cache: 'no-store',
    },
  );
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
