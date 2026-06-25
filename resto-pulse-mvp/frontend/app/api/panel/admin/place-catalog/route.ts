import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ detail: 'Bu sayfa sadece panel admin hesaplari icindir.' }, { status: 403 });
  }

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { detail: 'PANEL_ADMIN_SECRET tanimli degil (Vercel). Place catalog ozeti icin gerekli.' },
      { status: 503 },
    );
  }

  const authHeaders = await backendAuthHeadersFromSession();
  if (!authHeaders.Authorization) {
    return NextResponse.json(
      { detail: 'Backend oturumu olusturulamadi. Cikis yapip Google ile tekrar giris yapin.' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const recentLimit = Math.min(50, Math.max(1, Number(url.searchParams.get('recent_limit') ?? '10') || 10));
  const topQueriesLimit = Math.min(
    30,
    Math.max(1, Number(url.searchParams.get('top_queries_limit') ?? '10') || 10),
  );
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '30') || 30));

  const response = await fetch(
    `${API_BASE}/api/v1/metrics/admin/place-catalog?recent_limit=${recentLimit}&top_queries_limit=${topQueriesLimit}&days=${days}`,
    {
      headers: {
        'X-Panel-Admin-Secret': secret,
        ...authHeaders,
      },
      cache: 'no-store',
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Place catalog ozeti alinamadi';
    return NextResponse.json({ detail }, { status: response.status });
  }
  return NextResponse.json(data);
}
