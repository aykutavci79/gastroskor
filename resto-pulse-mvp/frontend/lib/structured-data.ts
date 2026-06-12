import type { Restaurant, RestaurantListItem } from '@/lib/types';

export function buildOrganizationJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GastroSkor',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    email: 'destek@gastroskor.com.tr',
    description:
      'Türkiye restoran puanlama ve keşif platformu. Bursa ve diğer şehirlerde gastro skor, yorum ve restoran arama.',
  };
}

export function buildWebSiteJsonLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GastroSkor',
    alternateName: ['gastroskor', 'Gastro Skor'],
    url: siteUrl,
    inLanguage: 'tr-TR',
    description: 'Restoran ara, gastro skor oku ve yorum bırak.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/bursa?tag={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildRegionalFlavorListJsonLd(
  siteUrl: string,
  items: { slug: string; name: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Bursa Yöresel Lezzetler — GastroSkor',
    url: `${siteUrl}/yoresel-lezzetler`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${siteUrl}/yoresel-lezzetler/${item.slug}`,
    })),
  };
}

export function buildRestaurantJsonLd(
  restaurant: Restaurant,
  siteUrl: string,
  options?: { reviewCount?: number },
) {
  const url = `${siteUrl}/restaurants/${restaurant.id}`;
  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    url,
  };

  if (restaurant.address || restaurant.city) {
    json.address = {
      '@type': 'PostalAddress',
      streetAddress: restaurant.address ?? undefined,
      addressLocality: restaurant.city ?? undefined,
      addressRegion: restaurant.district ?? undefined,
      addressCountry: 'TR',
    };
  }

  if (restaurant.latitude != null && restaurant.longitude != null) {
    json.geo = {
      '@type': 'GeoCoordinates',
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    };
  }

  if (restaurant.category) {
    json.servesCuisine = restaurant.category;
  }

  const ratingCount = options?.reviewCount ?? 0;
  if (restaurant.avg_rating != null && ratingCount > 0) {
    json.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: restaurant.avg_rating,
      bestRating: 5,
      ratingCount,
    };
  }

  return json;
}

export function buildItemListJsonLd(
  siteUrl: string,
  items: RestaurantListItem[],
  options: { name: string; path: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options.name,
    url: `${siteUrl}${options.path}`,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `${siteUrl}/restaurants/${item.id}`,
    })),
  };
}

export function buildBreadcrumbJsonLd(
  siteUrl: string,
  crumbs: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${siteUrl}${crumb.path}`,
    })),
  };
}

export function buildRegionalFlavorFoodJsonLd(
  siteUrl: string,
  options: {
    name: string;
    description: string;
    path: string;
    areaServed: string;
  },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: options.name,
    description: options.description,
    url: `${siteUrl}${options.path}`,
    areaServed: options.areaServed,
    servesCuisine: 'Türk Mutfağı',
  };
}

export function buildFaqJsonLd(items: { question: string; answer: string }[]) {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
