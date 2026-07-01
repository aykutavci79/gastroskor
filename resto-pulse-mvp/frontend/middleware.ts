import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n for panel, API routes, and static assets
  const skipPaths = [
    '/panel',
    '/api',
    '/_next',
    '/favicon',
    '/logo',
    '/manifest',
    '/robots',
    '/sitemap',
    '/.well-known',
  ];
  if (skipPaths.some((p) => pathname.startsWith(p))) {
    return;
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all public paths, skip Next.js internals and static files
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
};
