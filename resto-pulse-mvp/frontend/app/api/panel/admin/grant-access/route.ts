import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await backendAuthHeadersFromSession()),
  };
  if (secret) {
    headers['X-Panel-Admin-Secret'] = secret;
  }

  const response = await fetch(`${API_BASE}/api/v1/panel/admin/grant-access`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_email: session!.user!.email,
      place_id: body.place_id.trim(),
      city: body.city?.trim() || 'Bursa',
      force_takeover: Boolean(body.force_takeover),
      admin_note: body.admin_note?.trim() || 'Admin UI ile baglandi.',
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { detail?: string | { msg?: string }[] };
  if (!response.ok) {
    const detail =
      typeof data.detail === 'string'
        ? data.detail
        : Array.isArray(data.detail)
          ? data.detail.map((d) => d.msg).filter(Boolean).join(', ')
          : 'Baglama basarisiz';
    return NextResponse.json(
      {
        detail:
          response.status === 403
            ? `${detail} — Railway'de de PANEL_ADMIN_EMAILS (ve istege bagli PANEL_ADMIN_SECRET) ayarla.`
            : detail,
      },
      { status: response.status },
    );
  }
  return NextResponse.json(data, { status: response.status });
}
