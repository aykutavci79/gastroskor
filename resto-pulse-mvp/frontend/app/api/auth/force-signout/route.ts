import { NextResponse } from 'next/server';

const COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  '__Host-next-auth.session-token',
  'next-auth.csrf-token',
  '__Secure-next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'next-auth.callback-url',
  '__Secure-next-auth.callback-url',
  '__Host-next-auth.callback-url',
  'next-auth.redirect',
  '__Secure-next-auth.redirect',
  '__Host-next-auth.redirect',
];

function resolveSiteUrl(request: Request): string {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host) {
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

function buildRedirectResponse(request: Request) {
  const redirectUrl = resolveSiteUrl(request);
  const res = NextResponse.redirect(redirectUrl);
  const isHttps = redirectUrl.startsWith('https://');
  for (const name of COOKIE_NAMES) {
    try {
      res.cookies.set(name, '', {
        path: '/',
        expires: new Date(0),
        secure: isHttps,
        sameSite: 'lax',
      });
    } catch (e) {
      // best-effort
    }
  }
  return res;
}

export function GET(request: Request) {
  return buildRedirectResponse(request);
}

export function POST(request: Request) {
  return buildRedirectResponse(request);
}
