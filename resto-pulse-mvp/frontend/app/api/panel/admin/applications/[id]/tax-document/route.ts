import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();
  if (!email) {
    return NextResponse.json({ detail: 'Google ile giris gerekli.' }, { status: 401 });
  }
  if (!ADMIN_EMAILS.length || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json({ detail: 'Admin yetkisi yok.' }, { status: 403 });
  }

  const secret = process.env.PANEL_ADMIN_SECRET?.trim();
  const headers: Record<string, string> = {};
  if (secret) headers['X-Panel-Admin-Secret'] = secret;

  const query = new URLSearchParams({ user_email: email });
  const response = await fetch(`${API_BASE}/api/v1/panel/admin/applications/${id}/tax-document?${query}`, {
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  }

  const blob = await response.blob();
  const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
  const disposition = response.headers.get('content-disposition') ?? `attachment; filename="vergi-levhasi-${id.slice(0, 8)}"`;
  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
    },
  });
}
