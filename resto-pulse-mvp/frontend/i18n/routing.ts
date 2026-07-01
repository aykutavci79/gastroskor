import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ar'],
  defaultLocale: 'tr',
  // Locale never appears in the URL — stored in cookie only.
  // This keeps all existing URLs intact (/, /sss, /bursa, etc.)
  // and avoids 404s from /en/ routes that don't exist under app/[locale]/.
  localePrefix: 'never',
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
