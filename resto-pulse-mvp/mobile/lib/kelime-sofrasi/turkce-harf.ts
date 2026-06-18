/** Kelime Sofrası — Türkçe büyük harf; İ/i ile I/ı ayrımı korunur (cevapNormalize kullanılmaz). */

const SOFRA_ALLOWED = /^[A-ZÇĞİÖŞÜI]+$/u;

/** ASCII-fold anahtar — yalnızca havuz eşlemesi için (oyun içi karşılaştırmada kullanılmaz). */
export function asciiKelimeAnahtar(raw: string): string {
  return raw
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'C')
    .replace(/[^A-Z]/g, '');
}

/** Oyun içi kanonik kelime formu — tam Türkçe büyük harf. */
export function sofraKelimeBuyuk(raw: string): string {
  return raw
    .trim()
    .toLocaleUpperCase('tr-TR')
    .replace(/[^A-ZÇĞİÖŞÜI]/gu, '');
}

export function sofraKelimeGecerli(raw: string): boolean {
  const k = sofraKelimeBuyuk(raw);
  return k.length > 0 && SOFRA_ALLOWED.test(k);
}

/** Tam eşleşme — case-fold yok. */
export function sofraKelimeEsit(a: string, b: string): boolean {
  return sofraKelimeBuyuk(a) === sofraKelimeBuyuk(b);
}

export function sofraHarfEsit(a: string, b: string): boolean {
  return sofraKelimeBuyuk(a) === sofraKelimeBuyuk(b);
}
