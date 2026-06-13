/** Sesli siparis — backend katalogu ile uyumlu urun listesi. */

export type VoiceCatalogProduct = {
  slug: string;
  label: string;
  searchGroup: string;
  aliases: string[];
};

export const VOICE_CATALOG_PRODUCTS: VoiceCatalogProduct[] = [
  { slug: 'lahmacun', label: 'Lahmacun', searchGroup: 'lahmacun', aliases: ['lahmacun', 'lahmacunu'] },
  { slug: 'cantik', label: 'Cantık', searchGroup: 'cantik', aliases: ['cantık', 'cantik'] },
  {
    slug: 'acili-lahmacun',
    label: 'Acılı Lahmacun',
    searchGroup: 'lahmacun',
    aliases: ['acılı lahmacun', 'acı lahmacun', 'acili lahmacun'],
  },
  {
    slug: 'sutlac',
    label: 'Sütlaç',
    searchGroup: 'sutlac',
    aliases: ['sütlaç', 'sutlac', 'sutlaş', 'sutlas', 'fırın sütlaç', 'firin sutlac'],
  },
  { slug: 'baklava', label: 'Baklava', searchGroup: 'baklava', aliases: ['baklava', 'cevizli baklava', 'fıstıklı baklava'] },
  { slug: 'kunefe', label: 'Künefe', searchGroup: 'kunefe', aliases: ['künefe', 'kunefe', 'kaymaklı künefe', 'kaymakli kunefe'] },
  {
    slug: 'borek',
    label: 'Börek',
    searchGroup: 'borek',
    aliases: ['börek', 'borek', 'su böreği', 'su boregi', 'peynirli börek', 'peynirli borek'],
  },
  {
    slug: 'cantik-kiymali',
    label: 'Kıymalı Cantık',
    searchGroup: 'cantik',
    aliases: ['kıymalı cantık', 'kiymali cantik', 'kıymalı cantı', 'kiymali canti'],
  },
  {
    slug: 'cantik-kusbasili',
    label: 'Kuşbaşılı Cantık',
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
  {
    slug: 'kadayif',
    label: 'Kadayıf',
    searchGroup: 'kadayif',
    aliases: ['kadayıf', 'kadayif', 'kadayifi', 'kadayıfı', 'sütlü kadayıf', 'sutlu kadayif'],
  },
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
  'iki yüz lira',
  'yüz elli lira',
  'mesafede',
  'yakınımda',
  'lahmacun arar mısın',
  'arar mısın',
];
