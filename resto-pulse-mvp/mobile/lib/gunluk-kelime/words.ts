import { GUNLUK_KELIME_LENGTH } from '@/constants/gunluk-kelime';
import { gunlukKelimeGraphemes } from '@/lib/gunluk-kelime/grapheme';
import {
  gastroKanonikKelime,
  gastroLexiconCevap5,
  gastroLexiconTahmin5,
} from '@/lib/gastro-lexicon';
import { asciiKelimeAnahtar, sofraKelimeGecerli } from '@/lib/kelime-sofrasi/turkce-harf';

function buildAsciiMap(words: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const raw of words) {
    try {
      const canon = gastroKanonikKelime(String(raw));
      if (gunlukKelimeGraphemes(canon).length !== GUNLUK_KELIME_LENGTH || !sofraKelimeGecerli(canon)) {
        continue;
      }
      map.set(asciiKelimeAnahtar(canon), canon);
    } catch {
      // bozuk satir
    }
  }
  return map;
}

const TAHMIN_BY_ASCII = buildAsciiMap(gastroLexiconTahmin5());
const CEVAP_BY_ASCII = buildAsciiMap(gastroLexiconCevap5());

const TAHMIN_WORDS: readonly string[] = [...TAHMIN_BY_ASCII.values()].sort((a, b) =>
  a.localeCompare(b, 'tr'),
);
const CEVAP_WORDS: readonly string[] = [...CEVAP_BY_ASCII.values()].sort((a, b) =>
  a.localeCompare(b, 'tr'),
);

/** Günlük Kelime tahmin sözlüğü (~5.3k TDK). */
export function gunlukKelimeSozluk(): readonly string[] {
  return TAHMIN_WORDS;
}

/** Günlük cevap havuzu — daha dar, günlük kelime seçimi. */
export function gunlukKelimeCevapHavuzu(): readonly string[] {
  return CEVAP_WORDS;
}

export function gunlukKelimeGecerliMi(word: string): boolean {
  return gunlukKelimeKanonik(word) !== null;
}

/** Sözlükteki kanonik yazım — klavyedeki harfler bire bir eşleşmeli (I≠İ, O≠Ö). */
export function gunlukKelimeKanonik(word: string): string | null {
  try {
    if (gunlukKelimeGraphemes(word).length !== GUNLUK_KELIME_LENGTH) return null;
    const norm = gunlukKelimeGraphemes(word).join('');
    const canon = TAHMIN_BY_ASCII.get(asciiKelimeAnahtar(norm));
    if (!canon || norm !== canon) return null;
    return canon;
  } catch {
    return null;
  }
}
