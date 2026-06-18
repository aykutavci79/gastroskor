import type { ImageSourcePropType } from 'react-native';

/** Yöresel lezzet görselleri — uygulama içi; web /public ile aynı dosyalar. */
export const LOCAL_REGIONAL_FLAVOR_IMAGES: Record<string, ImageSourcePropType> = {
  'bursa-cantik': require('@/assets/regional-flavors/bursa-cantik.jpg'),
  'bursa-cevizli-lokum': require('@/assets/regional-flavors/bursa-cevizli-lokum.jpg'),
  'bursa-sut-helvasi': require('@/assets/regional-flavors/bursa-sut-helvasi.jpg'),
  'bursa-tahinli-pide': require('@/assets/regional-flavors/bursa-tahinli-pide.jpg'),
  'kemalpasa-tatlisi': require('@/assets/regional-flavors/kemalpasa-tatlisi.jpg'),
  'inegol-sutlu-kadayifi': require('@/assets/regional-flavors/inegol-sutlu-kadayifi.jpg'),
  'bursa-doner-kebabi': require('@/assets/regional-flavors/bursa-doner-kebabi.jpg'),
  'bursa-pideli-kofte': require('@/assets/regional-flavors/bursa-pideli-kofte.jpg'),
  'zeyniler-hinkali': require('@/assets/regional-flavors/zeyniler-hinkali.jpg'),
  'inegol-buryani': require('@/assets/regional-flavors/inegol-buryani.jpg'),
  'inegol-kofte': require('@/assets/regional-flavors/inegol-kofte.jpg'),
  'inegol-piyazi': require('@/assets/regional-flavors/inegol-piyazi.jpg'),
};

export function regionalFlavorLocalImage(slug: string): ImageSourcePropType | null {
  return LOCAL_REGIONAL_FLAVOR_IMAGES[slug] ?? null;
}

const SOFRA_BG_SLUGS = Object.keys(LOCAL_REGIONAL_FLAVOR_IMAGES);

/** Günlük bulmaca id'sine göre sabit bir yemek arka planı seçer. */
export function sofraBackgroundForPuzzle(puzzleId: string): ImageSourcePropType {
  let hash = 0;
  for (let i = 0; i < puzzleId.length; i++) {
    hash = (hash * 31 + puzzleId.charCodeAt(i)) >>> 0;
  }
  const slug = SOFRA_BG_SLUGS[hash % SOFRA_BG_SLUGS.length]!;
  return LOCAL_REGIONAL_FLAVOR_IMAGES[slug]!;
}
