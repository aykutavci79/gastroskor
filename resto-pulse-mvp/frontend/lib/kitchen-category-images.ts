import { ONLINE_ORDER_CATEGORIES } from '@/lib/online-order-categories';

const KITCHEN_IMAGE_BASE = '/images/kitchens';

export const KITCHEN_CATEGORY_IMAGE_PATHS: Record<string, string> = {
  'tatli-tuzlu': `${KITCHEN_IMAGE_BASE}/tatli-tuzlu.webp`,
  doner: `${KITCHEN_IMAGE_BASE}/doner.webp`,
  'kebap-izgara': `${KITCHEN_IMAGE_BASE}/kebap-izgara.webp`,
  firin: `${KITCHEN_IMAGE_BASE}/firin.webp`,
  sokak: `${KITCHEN_IMAGE_BASE}/sokak.webp`,
  burger: `${KITCHEN_IMAGE_BASE}/burger.webp`,
  'ev-yemekleri': `${KITCHEN_IMAGE_BASE}/ev-yemekleri.webp`,
  kahvalti: `${KITCHEN_IMAGE_BASE}/kahvalti.webp`,
  kahve: `${KITCHEN_IMAGE_BASE}/kahve.webp`,
  deniz: `${KITCHEN_IMAGE_BASE}/deniz.webp`,
  'salata-fit': `${KITCHEN_IMAGE_BASE}/salata-fit.webp`,
};

export const ONLINE_ORDER_BANNER_SLIDES = ONLINE_ORDER_CATEGORIES.flatMap((cat) => {
  const src = KITCHEN_CATEGORY_IMAGE_PATHS[cat.slug];
  if (!src) return [];
  return [{ slug: cat.slug, src }];
});
