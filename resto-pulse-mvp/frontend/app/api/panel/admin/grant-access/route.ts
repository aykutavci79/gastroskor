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

  const secret = process.env.PANEL_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ detail: 'PANEL_ADMIN_SECRET sunucuda tanimli degil.' }, { status: 500 });
  }

  let body: {
    place_id?: string;
    city?: string;
    force_takeover?: boolean;
    admin_note?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Gecersiz JSON.' }, { status: 400 });
  }

  if (!body.place_id?.trim()) {
    return NextResponse.json({ detail: 'place_id gerekli.' }, { status: 400 });
  }

  const response = await fetch(`${API_BASE}/api/v1/panel/admin/grant-access`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Panel-Admin-Secret': secret,
    },
    body: JSON.stringify({
      user_email: session!.user!.email,
      place_id: body.place_id.trim(),
      city: body.city?.trim() || 'Bursa',
      force_takeover: Boolean(body.force_takeover),
      admin_note: body.admin_note?.trim() || 'Admin UI ile baglandi.',
    }),
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
