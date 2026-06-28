/**
 * Whisper / STT sonrasi urun ve arama ifadesi duzeltmeleri.
 * "cantı kara" -> cantık, "jantı kara" -> cantık vb.
 */
export const VOICE_STT_PRODUCT_PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bjant[ıi]\s*kara\b/gi, 'cantık'],
  [/\bjant[ıi]kara\b/gi, 'cantık'],
  [/\bjantikara\b/gi, 'cantık'],
  [/\bcant[ıi]\s*kara\b/gi, 'cantık'],
  [/\bcant[ıi]kara\b/gi, 'cantık'],
  [/\bcantikara\b/gi, 'cantık'],
  [/\bcantic\b/gi, 'cantık'],
  [/\bcantik\b/gi, 'cantık'],
  [/\bcant[ıi]c\b/gi, 'cantık'],
  [/\blahma\s*cun\b/gi, 'lahmacun'],
  [/\blamacun\b/gi, 'lahmacun'],
  [/\blahmacun\s*cu\b/gi, 'lahmacuncu'],
  [/\blahmacuncu\b/gi, 'lahmacuncu'],
  [/\bkazandi\s*bi\b/gi, 'kazandibi'],
  [/\bkazandibi\b/gi, 'kazandibi'],
  [/\bsut\s*lac\b/gi, 'sütlaç'],
  [/\bsutlac\b/gi, 'sütlaç'],
  [/\bsutla[cs]\b/gi, 'sütlaç'],
  [/\bkune\s*fe\b/gi, 'künefe'],
  [/\bkunefe\b/gi, 'künefe'],
  [/\bkada\s*yif\b/gi, 'kadayıf'],
  [/\bkadayif\b/gi, 'kadayıf'],
  [/\bis\s*kender\b/gi, 'iskender'],
  [/\biskender\b/gi, 'iskender'],
  [/\bpide\s*li\b/gi, 'pideli'],
  [/\bpideli\s*köfte\b/gi, 'pideli köfte'],
  [/\bpideli\s*kofte\b/gi, 'pideli köfte'],
  [/\bdoner\s*ci\b/gi, 'dönerci'],
  [/\bdonerci\b/gi, 'dönerci'],
  [/\bdoner\b/gi, 'döner'],
  [/\bdurum\b/gi, 'dürüm'],
  [/\bkebap\s*ci\b/gi, 'kebapçı'],
  [/\bkebapci\b/gi, 'kebapçı'],
  [/\btatli\s*ci\b/gi, 'tatlıcı'],
  [/\btatlici\b/gi, 'tatlıcı'],
  [/\badana\s*kebap\b/gi, 'adana kebap'],
  [/\burfa\s*kebap\b/gi, 'urfa kebap'],
  [/\btantuni\b/gi, 'tantuni'],
  [/\biskil\b/gi, 'iskil'],
  [/\bkiymali\s*cant[ıi]k\b/gi, 'kıymalı cantık'],
  [/\bkusbasili\s*cant[ıi]k\b/gi, 'kuşbaşılı cantık'],
];

/** Siparis / online arama — harf ve odeme. */
export const VOICE_STT_ORDER_PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bbe\s*den\b/gi, "b'den"],
  [/\bbe\s*dan\b/gi, "b'den"],
  [/\ba\s*den\b/gi, "a'den"],
  [/\ba\s*dan\b/gi, "a'den"],
  [/\bc\s*den\b/gi, "c'den"],
  [/\bc\s*dan\b/gi, "c'den"],
  [/\btl\s*i\s*gecme\b/gi, 'tl geçmesin'],
  [/\btl\s*yi\s*gecme\b/gi, 'tl geçmesin'],
  [/\b400\s*tl\s*i\s*gecme\b/gi, '400 tl geçmesin'],
  [/\bkredi\s*kart\b/gi, 'kredi kartı'],
  [/\buc\s*adet\b/gi, '3 adet'],
  [/\büç\s*adet\b/gi, '3 adet'],
  [/\biki\s*adet\b/gi, '2 adet'],
  [/\bbir\s*adet\b/gi, '1 adet'],
];

/** Kesfet arama — mesafe / puan. */
export const VOICE_STT_SEARCH_PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\byildiz\b/gi, 'yıldız'],
  [/\bdort\s*bucuk\b/gi, '4.5'],
  [/\bdört\s*buçuk\b/gi, '4.5'],
  [/\bdört\s*yıldız\s*üstü\b/gi, '4 yıldız üstü'],
  [/\bdort\s*yildiz\s*ustu\b/gi, '4 yıldız üstü'],
  [/\b4\s*buçuk\b/gi, '4.5'],
  [/\byorum\s*üstü\b/gi, 'yorum üstü'],
  [/\byorum\s*ustu\b/gi, 'yorum üstü'],
  [/\ben\s*yakin\b/gi, 'en yakın'],
  [/\bkonumuma\s*yakin\b/gi, 'konumuma en yakın'],
];

export function applyVoiceSttPhraseFixes(
  text: string,
  extra: Array<[RegExp, string]> = [],
): string {
  let out = text;
  for (const group of [
    VOICE_STT_PRODUCT_PHRASE_FIXES,
    VOICE_STT_ORDER_PHRASE_FIXES,
    VOICE_STT_SEARCH_PHRASE_FIXES,
    extra,
  ]) {
    for (const [pattern, replacement] of group) {
      out = out.replace(pattern, replacement);
    }
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

/** Whisper prompt / oneri listesi — urun ve tipik cumleler. */
export const VOICE_WHISPER_CONTEXT_PHRASES: string[] = [
  'cantık',
  'cantık ara',
  'lahmacun',
  'lahmacuncu',
  'pideli köfte',
  'iskender',
  'künefe',
  'sütlaç',
  'kadayıf',
  'baklava',
  'adana kebap',
  'döner',
  'ayran',
  'şalgam',
  'kebapçı',
  'tatlıcı',
  'en yakın',
  'yakınımda',
  'geçmesin',
  'online sipariş',
  '3 lahmacun 1 ayran',
  '3 lahmacun 1 şalgam',
  '400 tl geçmesin',
];
