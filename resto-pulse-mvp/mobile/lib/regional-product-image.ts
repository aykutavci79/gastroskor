import type { ImageSourcePropType } from 'react-native';

import { regionalFlavorLocalImage } from '@/constants/regional-flavor-images';

const DEFAULT_SITE = 'https://www.gastroskor.com.tr';

export function resolveRegionalProductImageUri(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const raw = url.trim();
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const site = (process.env.EXPO_PUBLIC_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${site}${path}`;
}

/** Yerel asset öncelikli — prod CDN 500 verse bile banner çalışır. */
export function regionalProductImageSource(
  slug: string,
  remoteUrl?: string | null,
): ImageSourcePropType | null {
  const local = regionalFlavorLocalImage(slug);
  if (local) return local;
  const uri = resolveRegionalProductImageUri(remoteUrl);
  return uri ? { uri } : null;
}
