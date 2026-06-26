const DEFAULT_SITE = 'https://www.gastroskor.com.tr';

function toLocalPath(url: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
  if (url.startsWith(site)) {
    const path = url.slice(site.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

/** API mobil icin tam URL dondurur; web Next/Image icin yerel yola indirger. */
export function regionalProductImageSrc(url: string): string {
  return toLocalPath(url);
}

/** .jpeg ↔ .jpg uyumsuzlugu (eski bundle / TURKPATENT scrape). */
export function alternateRegionalImageSrc(url: string): string | null {
  const path = toLocalPath(url);
  if (/\.jpeg$/i.test(path)) return path.replace(/\.jpeg$/i, '.jpg');
  if (/\.jpg$/i.test(path)) return path.replace(/\.jpg$/i, '.jpeg');
  return null;
}
