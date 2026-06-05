import type { MetadataRoute } from 'next';

import { getApiV1Base } from '@/lib/api-base';
import { getSiteUrl } from '@/lib/site-url';
import type { RestaurantListItem } from '@/lib/types';

const STATIC_PATHS = [
  '/',
  '/yoresel-lezzetler',
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
    if (!response.ok) return [];
    const data = (await response.json()) as { items?: { slug: string }[] };
    return (data.items ?? []).map((item) => item.slug).filter(Boolean);
  } catch {
    return [];
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

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === '/' ? siteUrl : `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'monthly',
    priority: path === '/' ? 1 : 0.4,
  }));

  const restaurantIds = await fetchRestaurantIds();
  const regionalSlugs = await fetchRegionalProductSlugs();
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
    priority: 0.65,
  }));

  return [...staticEntries, ...restaurantEntries, ...regionalEntries];
}
