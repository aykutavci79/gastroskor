import { categoryLabel, ONLINE_ORDER_CATEGORIES } from '@/constants/online-order-categories';

/**
 * Google Nearby keyword — kisa tutulmali (uzun hint tek sonuc donduruyor).
 * Ornek: kebap icin "Adana Urfa kofte steak..." yerine "kebap".
 */
const KITCHEN_CHIP_QUERY: Record<string, string> = {
  'tatli-tuzlu': 'baklava pastane tatlı',
  doner: 'döner',
  'kebap-izgara': 'kebap adana urfa',
  firin: 'lahmacun pide',
  sokak: 'tantuni çiğ köfte',
  burger: 'burger',
  'ev-yemekleri': 'ev yemekleri',
  kahvalti: 'kahvaltı',
  kahve: 'kahve',
  deniz: 'balık deniz',
  'salata-fit': 'salata',
};

/** Mutfak chip tiklaninca canli arama sorgusu. */
export function kitchenChipSearchQuery(slug: string): string {
  const focused = KITCHEN_CHIP_QUERY[slug];
  if (focused) return focused;

  const cat = ONLINE_ORDER_CATEGORIES.find((row) => row.slug === slug);
  if (!cat) return slug.replace(/-/g, ' ');
  if (cat.hint?.trim()) {
    return cat.hint.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return cat.label.replace(/&/g, ' ').replace(/\s+/g, ' ').trim();
}

export function kitchenChipLabel(slug: string): string {
  return categoryLabel(slug);
}
