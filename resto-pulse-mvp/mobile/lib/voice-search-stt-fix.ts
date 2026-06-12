import { normalizeTrSpeechText } from '@/lib/turkish-text-fold';

/** STT'nin sik yanlis duydugu yemek / arama ifadeleri. */
const PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bkazandi\s*bi\b/gi, 'kazandibi'],
  [/\bkazandibi\b/gi, 'kazandibi'],
  [/\btatli\s*ci\b/gi, 'tatlıcı'],
  [/\btatlici\b/gi, 'tatlıcı'],
  [/\bkebap\s*ci\b/gi, 'kebapçı'],
  [/\bkebapci\b/gi, 'kebapçı'],
  [/\blahmacun\s*cu\b/gi, 'lahmacuncu'],
  [/\blahmacuncu\b/gi, 'lahmacuncu'],
  [/\bdoner\s*ci\b/gi, 'dönerci'],
  [/\bdonerci\b/gi, 'dönerci'],
  [/\bpide\s*li\b/gi, 'pideli'],
  [/\bpideli\s*köfte\b/gi, 'pideli köfte'],
  [/\bpideli\s*kofte\b/gi, 'pideli köfte'],
  [/\bcantic\b/gi, 'cantık'],
  [/\bcantik\b/gi, 'cantık'],
  [/\bkünefe\b/gi, 'künefe'],
  [/\bkunefe\b/gi, 'künefe'],
  [/\bis\s*kender\b/gi, 'iskender'],
  [/\byildiz\b/gi, 'yıldız'],
  [/\byildiz\b/gi, 'yıldız'],
  [/\bdort\s*bucuk\b/gi, '4.5'],
  [/\bdört\s*buçuk\b/gi, '4.5'],
  [/\b4\s*buçuk\b/gi, '4.5'],
  [/\byorum\s*üstü\b/gi, 'yorum üstü'],
  [/\byorum\s*ustu\b/gi, 'yorum üstü'],
  [/\ben\s*yakin\b/gi, 'en yakın'],
  [/\ben\s*yakin\b/gi, 'en yakın'],
  [/\bkonumuma\s*yakin\b/gi, 'konumuma en yakın'],
];

export function polishVoiceSearchTranscript(raw: string): string {
  let text = normalizeTrSpeechText(raw);
  if (!text) return '';

  for (const [pattern, replacement] of PHRASE_FIXES) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s{2,}/g, ' ').trim();
}

/** Android/iOS STT oneri listesi — kesfet arama cumleleri. */
export const KESFET_SEARCH_CONTEXT_PHRASES: string[] = [
  'en yakın lahmacuncu',
  'en yakın kebapçı',
  'en yakın tatlıcı',
  'kazandibi satan yer',
  '4.5 yıldız üstü',
  '200 yorum üstü',
  'yorum üstü lahmacun',
  'konumuma en yakın',
  'pideli köfte',
  'iskender',
  'cantık',
  'künefe',
  'sütlaç',
  'dönerci',
  'lahmacun',
  'kebapçı',
  'tatlıcı',
  'yıldız üstü',
];
