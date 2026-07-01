import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en', 'de', 'es', 'fr', 'it', 'pt', 'ru', 'ar'],
  defaultLocale: 'tr',
  // Turkish stays at /; other locales at /en/..., /de/... etc.
  localePrefix: 'as-needed',
  // RTL locales
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
