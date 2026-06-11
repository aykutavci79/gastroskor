import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

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

  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { detail: 'CRON_SECRET tanimli degil (Vercel). Railway CRON_SECRET ile ayni olmali.' },
      { status: 503 },
    );
  }

  const response = await fetch(`${API_BASE}/api/v1/internal/cron/seed-tester-online-restaurants`, {
    method: 'POST',
    headers: { 'X-Cron-Secret': cronSecret },
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Deneme restoranlari olusturulamadi';
    return NextResponse.json({ detail, ...data }, { status: response.status });
  }
  return NextResponse.json(data);
}
