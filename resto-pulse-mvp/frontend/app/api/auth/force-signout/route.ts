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

function buildRedirectResponse() {
  const redirectUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
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

export function GET() {
  return buildRedirectResponse();
}

export function POST() {
  return buildRedirectResponse();
}
