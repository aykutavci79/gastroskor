import pagesData from '@/data/regional-flavor-pages.json';

export type RegionalFlavorFaqItem = {
  question: string;
  answer: string;
};

export type RegionalFlavorPageContent = {
  slug: string;
  name: string;
  city: string;
  kategori: string;
  tescilYili: string;
  searchTag: string;
  seeAllHref: string;
  h1?: string;
  seo?: {
    title: string;
    description: string;
    keywords: string;
  };
  restaurantSectionTitle?: string;
  kisaTarih: string;
  urunBilgisi: string;
  schemaDescription?: string;
  faq: RegionalFlavorFaqItem[];
};

const pages = pagesData.pages as RegionalFlavorPageContent[];

export function getRegionalFlavorPageContent(slug: string): RegionalFlavorPageContent | null {
  return pages.find((page) => page.slug === slug) ?? null;
}

export function resolveRegionalFlavorH1(page: RegionalFlavorPageContent): string {
  return page.h1 ?? `${page.name} — Nerede Yenir?`;
}

export function resolveRegionalFlavorRestaurantTitle(page: RegionalFlavorPageContent): string {
  return page.restaurantSectionTitle ?? `${page.city}'nın En İyi ${page.name} Restoranları`;
}

export function resolveRegionalFlavorSeo(page: RegionalFlavorPageContent) {
  if (page.seo) return page.seo;
  const shortName = page.name.replace(/^Bursa\s+/i, '').replace(/^İnegöl\s+/i, '');
  return {
    title: `${page.name} Nerede Yenir? En İyi 10 Restoran | GastroSkor`,
    description: `${page.city}'nın TÜRKPATENT tescilli lezzeti ${shortName.toLowerCase()} nerede yenir? GastroSkor puanına göre en iyi restoranlar ve yorumlar.`,
    keywords: `${page.slug.replace(/-/g, ' ')}, ${page.searchTag}, ${page.city.toLowerCase()} restoran`,
  };
}

export function resolveRegionalFlavorSchemaDescription(page: RegionalFlavorPageContent): string {
  return (
    page.schemaDescription ??
    `${page.city}'nın TÜRKPATENT tescilli yöresel lezzeti ${page.name} hakkında bilgi ve en iyi restoranlar.`
  );
}
