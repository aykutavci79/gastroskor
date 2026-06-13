import {
  restaurantLocationLabel,
  sanitizeRestaurantDisplayName,
} from '@/lib/seo-title';

/** Screaming Frog / SERP alt siniri. */
export const SEO_DESC_MIN_LEN = 70;

/** Google snippet ~155 karakter onerisi. */
export const SEO_DESC_MAX_LEN = 155;

export function trimSeoDescription(text: string, maxLen = SEO_DESC_MAX_LEN): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const slice = clean.slice(0, maxLen - 1);
  const wordCut = slice.replace(/\s+\S*$/, '').trim();
  const base = wordCut.length >= SEO_DESC_MIN_LEN ? wordCut : slice.trim();
  return base.endsWith('…') ? base : `${base}…`;
}

type RestaurantSeoDescInput = {
  name: string | null | undefined;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  category?: string | null;
  avg_rating?: number | null;
  gi_product_name?: string | null;
};

export function restaurantSeoDescription(input: RestaurantSeoDescInput): string {
  const name = sanitizeRestaurantDisplayName(input.name) || 'Restoran';
  const location = restaurantLocationLabel(input.district, input.city, input.address);
  const category = input.category?.trim();
  const gi = input.gi_product_name?.trim();

  const ratingPart =
    input.avg_rating != null
      ? ` GastroSkor puanı ${input.avg_rating.toFixed(1)}.`
      : ' GastroSkor gastro skor ve kullanıcı yorumları.';

  const categoryPart = category ? ` ${category} restoranı` : ' Restoran';
  const giPart = gi ? ` Tescilli ${gi} sunumu.` : '';

  const candidates = [
    `${name}, ${location}:${categoryPart}.${ratingPart}${giPart} Menü fiyatları, adres haritası ve yorumlar.`,
    `${name} (${location}):${categoryPart}.${ratingPart} Menü, fiyat ve konum bilgisi GastroSkor'da.`,
    `${name}, ${location}: GastroSkor sayfası.${ratingPart} Menü fiyatları, yorumlar ve konum haritası.`,
  ];

  for (const candidate of candidates) {
    const trimmed = trimSeoDescription(candidate);
    if (trimmed.length >= SEO_DESC_MIN_LEN) {
      return trimmed;
    }
  }

  return trimSeoDescription(candidates[0]);
}

export function regionalFlavorListSeoDescription(): string {
  return trimSeoDescription(
    'Bursa yöresel lezzetleri: İskender, pideli köfte, cantık, İnegöl köfte ve 12 TÜRKPATENT ürünü için nerede yenir? GastroSkor restoran rehberi.',
  );
}
