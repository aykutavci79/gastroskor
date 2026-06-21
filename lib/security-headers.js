/**
 * Deri ve Kemik (derivekemik.com) — guvenlik header'lari.
 * CSP varsayilan: Report-Only (CSP_ENFORCE=true ile zorlayici mod).
 */

/** @typedef {{ key: string, value: string }} SecurityHeader */

/** @returns {string} */
function buildContentSecurityPolicy() {
  const connectSrc = [
    "'self'",
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net',
    'https://apps.abacus.ai',
  ].join(' ');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'none'",
    [
      "script-src 'self' 'unsafe-inline'",
      'https://www.googletagmanager.com',
      'https://apps.abacus.ai',
    ].join(' '),
    [
      "style-src 'self' 'unsafe-inline'",
      'https://fonts.googleapis.com',
    ].join(' '),
    [
      "img-src 'self' data: blob:",
      'https://cdn.abacus.ai',
      'https://*.public.blob.vercel-storage.com',
      'https://i.ytimg.com',
    ].join(' '),
    ["font-src 'self' data:", 'https://fonts.gstatic.com'].join(' '),
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];

  return directives.join('; ');
}

/** @returns {SecurityHeader[]} */
function securityHeaders() {
  const csp = buildContentSecurityPolicy();
  const enforce = process.env.CSP_ENFORCE === 'true';

  /** @type {SecurityHeader[]} */
  const headers = [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=()',
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

module.exports = { buildContentSecurityPolicy, securityHeaders };
