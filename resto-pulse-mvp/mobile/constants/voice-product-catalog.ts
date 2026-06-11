/** Sesli siparis — backend katalogu ile uyumlu urun listesi. */

export type VoiceCatalogProduct = {
  slug: string;
  label: string;
  searchGroup: string;
  aliases: string[];
};

export const VOICE_CATALOG_PRODUCTS: VoiceCatalogProduct[] = [
  { slug: 'lahmacun', label: 'Lahmacun', searchGroup: 'lahmacun', aliases: ['lahmacun', 'lahmacunu'] },
  {
    slug: 'acili-lahmacun',
    label: 'Acılı Lahmacun',
    searchGroup: 'lahmacun',
    aliases: ['acılı lahmacun', 'acı lahmacun', 'acili lahmacun'],
  },
  {
    slug: 'cantik-kiymali',
    label: 'Kıymalı Cantı',
    searchGroup: 'cantik',
    aliases: ['kıymalı cantı', 'kıymalı cantık', 'kiymali cantik'],
  },
  {
    slug: 'cantik-kusbasili',
    label: 'Kuşbaşılı Cantı',
    searchGroup: 'cantik',
    aliases: ['kuşbaşılı cantı', 'kuşbaşılı cantık', 'kusbasili cantik'],
  },
  { slug: 'pide', label: 'Pide', searchGroup: 'pide', aliases: ['pide', 'pidesi'] },
  { slug: 'kiymali-pide', label: 'Kıymalı Pide', searchGroup: 'pide', aliases: ['kıymalı pide', 'kiymali pide'] },
  { slug: 'adana-kebap', label: 'Adana Kebap', searchGroup: 'adana-kebap', aliases: ['adana', 'adana kebap'] },
  { slug: 'urfa-kebap', label: 'Urfa Kebap', searchGroup: 'urfa-kebap', aliases: ['urfa', 'urfa kebap'] },
  { slug: 'doner-durum', label: 'Döner Dürüm', searchGroup: 'doner', aliases: ['döner', 'doner', 'dürüm', 'durum'] },
  { slug: 'iskender', label: 'İskender', searchGroup: 'iskender', aliases: ['iskender', 'iskender kebap'] },
  { slug: 'ayran', label: 'Ayran', searchGroup: 'ayran', aliases: ['ayran'] },
  { slug: 'kola', label: 'Kola', searchGroup: 'kola', aliases: ['kola', 'cola'] },
  { slug: 'su', label: 'Su', searchGroup: 'su', aliases: ['su', 'şişe su', 'sise su'] },
];

const GROUP_LABELS: Record<string, string> = {
  lahmacun: 'Lahmacun',
  cantik: 'Cantık',
  pide: 'Pide',
  doner: 'Döner',
};

export function voiceSearchGroupLabel(group: string): string {
  return GROUP_LABELS[group] ?? VOICE_CATALOG_PRODUCTS.find((p) => p.slug === group)?.label ?? group;
}

/** STT onerisi — urun adlari. */
export const VOICE_CONTEXT_PHRASES: string[] = [
  ...VOICE_CATALOG_PRODUCTS.flatMap((p) => [p.label, ...p.aliases]),
  'kilometre',
  'lira',
  'mesafede',
  'yakınımda',
];
