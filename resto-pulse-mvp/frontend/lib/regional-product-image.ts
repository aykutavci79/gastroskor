const DEFAULT_SITE = 'https://www.gastroskor.com.tr';

/** API mobil icin tam URL dondurur; web Next/Image icin yerel yola indirger. */
export function regionalProductImageSrc(url: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
  if (url.startsWith(site)) {
    const path = url.slice(site.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  return url;
}
