import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { backendAuthHeadersFromSession } from '@/lib/server-backend-auth';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr').replace(/\/$/, '');
const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const isPanelAdmin = Boolean(email && ADMIN_EMAILS.includes(email));

  let railway: Record<string, unknown> | null = null;
  if (isPanelAdmin && email) {
    try {
      const headers: Record<string, string> = {
        ...(await backendAuthHeadersFromSession()),
      };
      const secret = process.env.PANEL_ADMIN_SECRET?.trim();
      if (secret) {
        headers['X-Panel-Admin-Secret'] = secret;
      }
      const response = await fetch(
        `${API_BASE}/api/v1/panel/admin/status?user_email=${encodeURIComponent(email)}`,
        { headers, cache: 'no-store' },
      );
      railway = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        railway = {
          ...railway,
          http_status: response.status,
        };
      }
    } catch (err) {
      railway = {
        error: err instanceof Error ? err.message : 'Railway admin status alinamadi',
      };
    }
  }

  return NextResponse.json({
    is_panel_admin: isPanelAdmin,
    email,
    admin_emails_configured: ADMIN_EMAILS.length > 0,
    panel_admin_secret_configured: Boolean(process.env.PANEL_ADMIN_SECRET?.trim()),
    railway,
  });
}
