/**
 * Vercel / Next.js guvenlik header'lari.
 * CSP varsayilan: Report-Only (CSP_ENFORCE=true ile zorlayici moda gecilir).
 */

export type SecurityHeader = { key: string; value: string };

function apiOrigins(): string[] {
  const origins = new Set<string>(['https://api.gastroskor.com.tr']);
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    try {
      origins.add(new URL(configured).origin);
    } catch {
      /* gecersiz env — varsayilan prod API kalir */
    }
  }
  return [...origins];
}

/** Ucuncu parti ve kendi domain'ler — CSP whitelist. */
export function buildContentSecurityPolicy(): string {
  const connectSrc = [
    "'self'",
    ...apiOrigins(),
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net',
  ].join(' ');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    // Next.js hydration + GA inline bootstrap
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    [
      "img-src 'self' data: blob:",
      'https://api.gastroskor.com.tr',
      'https://maps.googleapis.com',
      'https://*.googleusercontent.com',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
      'https://ci.turkpatent.gov.tr',
    ].join(' '),
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];

  return directives.join('; ');
}

export function securityHeaders(): SecurityHeader[] {
  const csp = buildContentSecurityPolicy();
  const enforce = process.env.CSP_ENFORCE === 'true';

  const headers: SecurityHeader[] = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(self), payment=()',
    },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    enforce
      ? { key: 'Content-Security-Policy', value: csp }
      : { key: 'Content-Security-Policy-Report-Only', value: csp },
  ];

  if (process.env.NODE_ENV === 'production') {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
}
