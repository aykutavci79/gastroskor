import type { ImageSourcePropType } from 'react-native';

/** GastroSkor mutfak gorselleri (WebP, ~70-115 KB / dosya). Yenilemek icin PNG koyup scripts/compress-kitchen-images.py calistir. */
export const LOCAL_KITCHEN_IMAGES: Record<string, ImageSourcePropType> = {
  'tatli-tuzlu': require('@/assets/kitchens/tatli-tuzlu.webp'),
  doner: require('@/assets/kitchens/doner.webp'),
  'kebap-izgara': require('@/assets/kitchens/kebap-izgara.webp'),
  firin: require('@/assets/kitchens/firin.webp'),
  sokak: require('@/assets/kitchens/sokak.webp'),
  burger: require('@/assets/kitchens/burger.webp'),
  'ev-yemekleri': require('@/assets/kitchens/ev-yemekleri.webp'),
  kahvalti: require('@/assets/kitchens/kahvalti.webp'),
  kahve: require('@/assets/kitchens/kahve.webp'),
  deniz: require('@/assets/kitchens/deniz.webp'),
  'salata-fit': require('@/assets/kitchens/salata-fit.webp'),
};

export const KITCHEN_TILE_GRADIENT: Record<string, [string, string]> = {
  'tatli-tuzlu': ['#5c2d42', '#2a1520'],
  doner: ['#5a3020', '#2a1810'],
  'kebap-izgara': ['#5c2818', '#281008'],
  firin: ['#6b3520', '#301808'],
  sokak: ['#5a4020', '#282010'],
  burger: ['#5c3d22', '#281808'],
  'ev-yemekleri': ['#4a5030', '#202410'],
  kahvalti: ['#6b5528', '#302810'],
  kahve: ['#4a3420', '#201810'],
  deniz: ['#204060', '#101828'],
  'salata-fit': ['#2a5030', '#101820'],
};

export type KitchenImageSource = { kind: 'local'; source: ImageSourcePropType };

export function kitchenCategoryImage(slug: string): KitchenImageSource | null {
  const source = LOCAL_KITCHEN_IMAGES[slug];
  if (!source) return null;
  return { kind: 'local', source };
}
