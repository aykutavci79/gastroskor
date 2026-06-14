const DEFAULT_SITE_URL = 'https://www.gastroskor.com.tr';

/** Canonical site URL (sitemap, Open Graph, Search Console). */
export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).trim();
  if (!raw) return DEFAULT_SITE_URL;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, '');
}

/** Schema.org WebSite.url — Google site name docs prefer trailing slash. */
export function getSiteHomeUrl(): string {
  return `${getSiteUrl()}/`;
}
