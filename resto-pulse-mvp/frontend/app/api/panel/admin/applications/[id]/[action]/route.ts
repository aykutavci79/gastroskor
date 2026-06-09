import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'mark-contract-received']);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await context.params;
  if (!ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ detail: 'Gecersiz islem.' }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({ detail: 'Admin yetkisi yok.' }, { status: 403 });
  }

  let body: { admin_note?: string; force_takeover?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...adminHeaders(secret),
    ...(await backendAuthHeadersFromSession()),
  };

  const response = await fetch(`${API_BASE}/api/v1/panel/admin/applications/${id}/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      user_email: email,
      admin_note: body.admin_note?.trim() || undefined,
      force_takeover: Boolean(body.force_takeover),
    }),
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

function adminHeaders(secret: string | undefined) {
  const headers: Record<string, string> = {};
  if (secret) headers['X-Panel-Admin-Secret'] = secret;
  return headers;
}
