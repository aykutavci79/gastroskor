export const ONLINE_ORDER_CATEGORIES = [
  {
    slug: 'tatli-tuzlu',
    label: 'Tatlı & Tuzlu',
    hint: 'Pasta, pastane, baklava, tatlıcı',
  },
  { slug: 'doner', label: 'Döner', hint: 'Et veya tavuk döner' },
  {
    slug: 'kebap-izgara',
    label: 'Kebap & Izgara',
    hint: 'Adana, Urfa, köfte, steak, ızgara kanat/tavuk',
  },
  { slug: 'firin', label: 'Fırın', hint: 'Pizza, lahmacun, pide' },
  {
    slug: 'sokak',
    label: 'Sokak Lezzetleri',
    hint: 'Çiğ köfte, tantuni, tost, sokak yemeği',
  },
  { slug: 'burger', label: 'Burger', hint: 'Burger ve fast food' },
  {
    slug: 'ev-yemekleri',
    label: 'Ev Yemekleri',
    hint: 'Ev yemekleri, mantı, makarna, dünya mutfağı',
  },
  { slug: 'kahvalti', label: 'Kahvaltı', hint: 'Kahvaltı mekanları' },
  { slug: 'kahve', label: 'Kahve & İçecek', hint: 'Kahve, çay, içecek mekanları' },
  { slug: 'deniz', label: 'Deniz Ürünleri', hint: 'Balık ve deniz mahsulleri' },
  {
    slug: 'salata-fit',
    label: 'Salata & Fit',
    hint: 'Salata, meze, vejetaryen, fit menü',
  },
] as const;

export const LEGACY_CATEGORY_SLUG_MAP: Record<string, string> = {
  'pasta-tatli': 'tatli-tuzlu',
  'pastane-firin': 'tatli-tuzlu',
  baklava: 'tatli-tuzlu',
  'kahve-icecek': 'kahve',
  tavuk: 'kebap-izgara',
  kebap: 'kebap-izgara',
  kofte: 'kebap-izgara',
  steak: 'kebap-izgara',
  pizza: 'firin',
  'pide-lahmacun': 'firin',
  'cig-kofte': 'sokak',
  tantuni: 'sokak',
  'tost-sandwich': 'sokak',
  'sokak-lezzetleri': 'sokak',
  'manti-makarna': 'ev-yemekleri',
  'dunya-mutfagi': 'ev-yemekleri',
  'deniz-urunleri': 'deniz',
  salata: 'salata-fit',
  meze: 'salata-fit',
  vejetaryen: 'salata-fit',
  fit: 'salata-fit',
};

export function normalizeCategorySlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  return LEGACY_CATEGORY_SLUG_MAP[key] ?? key;
}
