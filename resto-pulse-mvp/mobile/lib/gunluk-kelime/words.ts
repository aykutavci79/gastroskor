import { GUNLUK_KELIME_LENGTH } from '@/constants/gunluk-kelime';
import { gunlukKelimeGraphemes } from '@/lib/gunluk-kelime/grapheme';
import { gastroLexiconCevap5, gastroLexiconTahmin5 } from '@/lib/gastro-lexicon';
import { asciiKelimeAnahtar } from '@/lib/kelime-sofrasi/turkce-harf';

/** build-gastro-lexicon.mjs ile önceden filtrelenmiş 5 harf listesi — runtime'da tekrar kanonikleştirme yok. */
function buildAsciiMapPrevalidated(words: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (let i = 0; i < words.length; i++) {
    const canon = words[i]!;
    map.set(asciiKelimeAnahtar(canon), canon);
  }
  return map;
}

let tahminByAsciiCache: Map<string, string> | null = null;

function tahminByAscii(): Map<string, string> {
  if (!tahminByAsciiCache) {
    tahminByAsciiCache = buildAsciiMapPrevalidated(gastroLexiconTahmin5());
  }
  return tahminByAsciiCache;
}

/** Tahmin sözlüğünü oyun/lobi açılışında ısıt — ilk ENTER'da UI donmasın. */
export function warmGunlukKelimeLexicon(): void {
  tahminByAscii();
}

/** Günlük Kelime tahmin sözlüğü (~5.3k TDK). */
export function gunlukKelimeSozluk(): readonly string[] {
  return gastroLexiconTahmin5();
}

/** Günlük cevap havuzu — daha dar, günlük kelime seçimi. */
export function gunlukKelimeCevapHavuzu(): readonly string[] {
  return gastroLexiconCevap5();
}

export function gunlukKelimeGecerliMi(word: string): boolean {
  return gunlukKelimeKanonik(word) !== null;
}

/** Sözlükteki kanonik yazım — klavyedeki harfler bire bir eşleşmeli (I≠İ, O≠Ö). */
export function gunlukKelimeKanonik(word: string): string | null {
  try {
    const graphemes = gunlukKelimeGraphemes(word);
    if (graphemes.length !== GUNLUK_KELIME_LENGTH) return null;
    const norm = graphemes.join('');
    const canon = tahminByAscii().get(asciiKelimeAnahtar(norm));
    if (!canon || norm !== canon) return null;
    return canon;
  } catch {
    return null;
  }
}
