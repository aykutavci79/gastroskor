import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.gastroskor.com.tr';
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!cronSecret || bearer !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiBase}/api/v1/internal/cron/panel-notifications`, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': cronSecret,
      },
      cache: 'no-store',
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // plain text
    }
    return NextResponse.json(body, { status: response.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron proxy failed' },
      { status: 502 },
    );
  }
}
