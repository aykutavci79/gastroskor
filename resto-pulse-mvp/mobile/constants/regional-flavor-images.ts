import type { ImageSourcePropType } from 'react-native';

const DEFAULT_SITE = 'https://www.gastroskor.com.tr';

function publicImageSource(path: string): ImageSourcePropType {
  const site = (process.env.EXPO_PUBLIC_SITE_URL ?? DEFAULT_SITE).replace(/\/$/, '');
  return { uri: `${site}${path}` };
}

/** Yöresel lezzet görselleri — yerel asset yoksa ürün payload'ındaki remote URL kullanılır. */
export const LOCAL_REGIONAL_FLAVOR_IMAGES: Record<string, ImageSourcePropType> = {
  // Keep this map require-free unless matching files are committed under mobile/assets.
};

export function regionalFlavorLocalImage(slug: string): ImageSourcePropType | null {
  return LOCAL_REGIONAL_FLAVOR_IMAGES[slug] ?? null;
}

const SOFRA_BACKGROUND_IMAGES: ImageSourcePropType[] = [
  publicImageSource('/images/regional-flavors/adana-kebabi.jpg'),
  publicImageSource('/images/regional-flavors/adana-bici-bici.jpeg'),
  publicImageSource('/images/regional-flavors/adana-halka-tatlisi.jpeg'),
  publicImageSource('/images/regional-flavors/adana-karpuzu.jpeg'),
  publicImageSource('/images/regional-flavors/adana-tas-kadayifi.jpeg'),
  publicImageSource('/images/regional-flavors/adiyaman-etsiz-cig-kofte.jpg'),
  publicImageSource('/images/regional-flavors/adiyaman-tene-helvasi.jpeg'),
  publicImageSource('/images/regional-flavors/aksaray-kabak-cekirdegi.jpeg'),
  publicImageSource('/images/regional-flavors/aksaray-tahinlisi.jpeg'),
  publicImageSource('/images/regional-flavors/aksaray-tulum-kebabi.jpeg'),
  publicImageSource('/images/regional-flavors/aksaray-un-kurabiyesi.jpeg'),
  publicImageSource('/images/regional-flavors/aksaray-serbetli-pidesi.jpeg'),
];

/** Günlük bulmaca id'sine göre sabit bir yemek arka planı seçer. */
export function sofraBackgroundForPuzzle(puzzleId: string): ImageSourcePropType {
  let hash = 0;
  for (let i = 0; i < puzzleId.length; i++) {
    hash = (hash * 31 + puzzleId.charCodeAt(i)) >>> 0;
  }
  return SOFRA_BACKGROUND_IMAGES[hash % SOFRA_BACKGROUND_IMAGES.length]!;
}
