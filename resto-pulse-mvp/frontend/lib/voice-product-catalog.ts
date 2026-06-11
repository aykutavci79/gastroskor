/** Sesli siparis urun katalogu — API ile senkron.

Panel ve mobil ayni backend katalogunu kullanir:
GET /voice-products/catalog
*/

export type VoiceSearchHint = {
  group: string;
  label: string;
  note: string;
};

/** Genel arama adlari — spesifik urunlerin ust gruplari. */
export const VOICE_SEARCH_GROUP_HINTS: VoiceSearchHint[] = [
  {
    group: 'lahmacun',
    label: 'Lahmacun',
    note: 'Lahmacun ve acili lahmacun ayri urundur; ikisi de "lahmacun" aramasinda cikar.',
  },
  {
    group: 'cantik',
    label: 'Cantik',
    note: 'Kiyma ve kusbasi cantik ayri urundur; ikisi de "cantik" aramasinda cikar.',
  },
];
