import type { Metadata } from 'next';

const BRAND = 'GastroSkor';
const BRAND_SUFFIX = ` | ${BRAND}`;

/** SERP'te ~561px — kabaca 58 karakter (| GastroSkor dahil). */
export const SEO_TITLE_MAX_LEN = 58;

const PLACEHOLDER_NAME = /^(blank|unknown|n\/a|yok|restoran|restaurant|mekan)$/i;

export function sanitizeRestaurantDisplayName(name: string | null | undefined): string {
  const clean = (name ?? '').replace(/\s+/g, ' ').trim();
  if (!clean || PLACEHOLDER_NAME.test(clean)) return '';
  return clean;
}

export function isPlaceholderRestaurantName(name: string | null | undefined): boolean {
  return sanitizeRestaurantDisplayName(name) === '';
}

function addressPlaceHint(address: string | null | undefined): string | null {
  if (!address?.trim()) return null;
  const text = address.trim();
  const mahalle = text.match(/([A-Za-zÇçĞğİıÖöŞşÜü0-9\s.'-]+?)\s+Mah(?:allesi)?\.?\b/i);
  if (mahalle?.[1]) {
    const label = mahalle[1].trim();
    if (label.length >= 3 && label.length <= 24) return label;
  }
  const parts = text.split(/[,·]/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (part.length < 4 || part.length > 24) continue;
    if (/^bursa$/i.test(part)) continue;
    if (/^\d/.test(part)) continue;
    return part;
  }
  return null;
}

function placeLabel(
  district?: string | null,
  city?: string | null,
  address?: string | null,
): string {
  if (district?.trim()) return district.trim();
  const hint = addressPlaceHint(address);
  if (hint) return hint;
  if (city?.trim()) return city.trim();
  return '';
}

export function trimSeoTitle(text: string, maxLen: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const slice = clean.slice(0, maxLen - 1);
  const wordCut = slice.replace(/\s+\S*$/, '').trim();
  const base = wordCut.length >= Math.min(24, maxLen - 8) ? wordCut : slice.trim();
  return base.endsWith('…') ? base : `${base}…`;
}

/** Layout template'e eklenmeden tek parca title (cift | GastroSkor onlenir). */
export function buildSeoTitle(primary: string): NonNullable<Metadata['title']> {
  const stripped = primary.replace(/\s*\|\s*GastroSkor\s*$/i, '').trim();
  const maxPrimary = SEO_TITLE_MAX_LEN - BRAND_SUFFIX.length;
  return {
    absolute: `${trimSeoTitle(stripped, maxPrimary)}${BRAND_SUFFIX}`,
  };
}

export function restaurantSeoTitle(
  name: string | null | undefined,
  district?: string | null,
  city?: string | null,
  address?: string | null,
): string {
  const cleanName = sanitizeRestaurantDisplayName(name);
  const place = placeLabel(district, city, address);
  const maxPrimary = SEO_TITLE_MAX_LEN - BRAND_SUFFIX.length;

  if (!cleanName) {
    if (place) return trimSeoTitle(`${place} restoranı`, maxPrimary);
    return 'Bursa restoranı';
  }

  if (!place) return trimSeoTitle(cleanName, maxPrimary);

  const combined = `${cleanName} · ${place}`;
  if (combined.length <= maxPrimary) return combined;

  const shortPlace = trimSeoTitle(place, Math.max(12, maxPrimary - cleanName.length - 3));
  const withPlace = `${cleanName} · ${shortPlace}`;
  if (withPlace.length <= maxPrimary) return withPlace;

  return trimSeoTitle(cleanName, maxPrimary);
}
