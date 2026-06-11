import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ detail: 'Bu islem sadece panel admin hesaplari icindir.' }, { status: 403 });
  }

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await backendAuthHeadersFromSession()),
  };
  if (secret) {
    headers['X-Panel-Admin-Secret'] = secret;
  }

  const response = await fetch(`${API_BASE}/api/v1/panel/admin/seed-tester-restaurants`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_email: session!.user!.email }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Deneme restoranlari olusturulamadi';
    return NextResponse.json(
      {
        detail:
          response.status === 403
            ? `${detail} — Railway'de PANEL_ADMIN_EMAILS icinde ${email} veya PANEL_ADMIN_SECRET (Vercel ile ayni) olmali.`
            : detail,
      },
      { status: response.status },
    );
  }
  return NextResponse.json(data);
}
