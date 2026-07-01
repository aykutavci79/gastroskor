import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip i18n middleware entirely for panel, API, and static assets.
  // With localePrefix:'never', the intl middleware only sets a locale
  // cookie and never redirects — but we still skip panel/api to avoid
  // any unexpected interference.
  if (
    pathname.startsWith('/panel') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/.well-known')
  ) {
    return;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot)).*)',
  ],
};
