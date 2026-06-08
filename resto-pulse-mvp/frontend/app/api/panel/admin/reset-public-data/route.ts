import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ detail: 'Bu sayfa sadece panel admin hesaplari icindir.' }, { status: 403 });
  }

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();

  let body: {
    place_id?: string;
    ownership_id?: string;
    hide_from_public?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Gecersiz JSON.' }, { status: 400 });
  }

  if (!body.place_id?.trim() && !body.ownership_id?.trim()) {
    return NextResponse.json({ detail: 'place_id veya ownership_id gerekli.' }, { status: 400 });
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['X-Panel-Admin-Secret'] = secret;
  }

  const response = await fetch(`${API_BASE}/api/v1/panel/admin/reset-public-data`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_email: session!.user!.email,
      place_id: body.place_id?.trim() || null,
      ownership_id: body.ownership_id?.trim() || null,
      hide_from_public: body.hide_from_public !== false,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === 'string' ? data.detail : 'Sifirlama basarisiz';
    return NextResponse.json({ detail }, { status: response.status });
  }
  return NextResponse.json(data, { status: response.status });
}
