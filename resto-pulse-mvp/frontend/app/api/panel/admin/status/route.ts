import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

const ADMIN_EMAILS = (process.env.PANEL_ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const isPanelAdmin = Boolean(email && ADMIN_EMAILS.includes(email));
  return NextResponse.json({
    is_panel_admin: isPanelAdmin,
    email,
    admin_emails_configured: ADMIN_EMAILS.length > 0,
  });
}
