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

  const data = (await response.json().catch(() => ({}))) as { detail?: string };
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Deneme restoranlari olusturulamadi';
    const hints: string[] = [];
    if (response.status === 401) {
      hints.push('Railway oturum reddetti — cikis yapip Google ile tekrar giris yapin.');
    }
    if (response.status === 403) {
      hints.push(
        `Railway'de PANEL_ADMIN_EMAILS icinde ${email} veya Vercel ile ayni PANEL_ADMIN_SECRET olmali.`,
      );
    }
    if (!process.env.PANEL_ADMIN_SECRET?.trim()) {
      hints.push('Vercel\'de PANEL_ADMIN_SECRET tanimli degil.');
    }
    return NextResponse.json(
      {
        detail: hints.length ? `${detail} ${hints.join(' ')}` : detail,
        status: response.status,
      },
      { status: response.status },
    );
  }
  return NextResponse.json(data);
}
