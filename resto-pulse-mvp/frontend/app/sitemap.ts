import type { MetadataRoute } from 'next';

import pagesData from '@/data/regional-flavor-pages.json';
import { getApiV1Base } from '@/lib/api-base';
import { getSiteUrl } from '@/lib/site-url';
import type { RestaurantListItem } from '@/lib/types';

const FALLBACK_REGIONAL_SLUGS = pagesData.pages.map((page) => page.slug).filter(Boolean);

const STATIC_PATHS = [
  '/',
  '/bursa',
  '/yoresel-lezzetler',
  '/isletme-basvuru',
  '/gizlilik',
  '/kvkk',
  '/kullanim-kosullari',
  '/hesap-sil',
] as const;

async function fetchRegionalProductSlugs(): Promise<string[]> {
  try {
    const response = await fetch(`${getApiV1Base()}/regional-flavors/products?city=Bursa`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) return FALLBACK_REGIONAL_SLUGS;
    const data = (await response.json()) as { items?: { slug: string }[] };
    const slugs = (data.items ?? []).map((item) => item.slug).filter(Boolean);
    return slugs.length > 0 ? slugs : FALLBACK_REGIONAL_SLUGS;
  } catch {
    return FALLBACK_REGIONAL_SLUGS;
  }
}

async function fetchRestaurantIds(): Promise<string[]> {
  try {
    const response = await fetch(`${getApiV1Base()}/restaurants?limit=200`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const rows = (await response.json()) as RestaurantListItem[];
    return rows.map((r) => r.id).filter(Boolean);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  let restaurantIds: string[] = [];
  let regionalSlugs: string[] = FALLBACK_REGIONAL_SLUGS;
  try {
    [restaurantIds, regionalSlugs] = await Promise.all([
      fetchRestaurantIds(),
      fetchRegionalProductSlugs(),
    ]);
  } catch {
    // Statik + yedek slug listesi ile devam et
  }

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === '/' ? siteUrl : `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : path === '/bursa' ? 0.9 : 0.4,
  }));

  const restaurantEntries: MetadataRoute.Sitemap = restaurantIds.map((id) => ({
    url: `${siteUrl}/restaurants/${id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const regionalEntries: MetadataRoute.Sitemap = regionalSlugs.map((slug) => ({
    url: `${siteUrl}/yoresel-lezzetler/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  return [...staticEntries, ...restaurantEntries, ...regionalEntries];
}
