import { gastroLexiconFullSet, gastroLexiconHasKelime } from '@/lib/gastro-lexicon';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

/** TDK doğrulanmış kelime seti — gastro-lexicon (Sofra + TDK + Yarışma). */
let lexiconCache: ReadonlySet<string> | null = null;

export function tdkLexicon(): ReadonlySet<string> {
  if (!lexiconCache) {
    lexiconCache = gastroLexiconFullSet();
  }
  return lexiconCache;
}

/** Sofra kelime doğrulama setini erken yükle. */
export function warmTdkLexicon(): void {
  tdkLexicon();
}

export function isTdkKelime(kelime: string): boolean {
  const canon = sofraKelimeBuyuk(kelime);
  if (tdkLexicon().has(canon)) return true;
  return gastroLexiconHasKelime(kelime);
}
