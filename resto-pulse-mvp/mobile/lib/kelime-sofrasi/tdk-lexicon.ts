import { sofraHavuzu } from '@/lib/kelime-sofrasi/havuz';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

/** TDK doğrulanmış kelime seti — havuz.json (2178 kayıt). */
let lexiconCache: Set<string> | null = null;

export function tdkLexicon(): ReadonlySet<string> {
  if (!lexiconCache) {
    lexiconCache = new Set(sofraHavuzu().map((w) => sofraKelimeBuyuk(w.kelime)));
  }
  return lexiconCache;
}

export function isTdkKelime(kelime: string): boolean {
  return tdkLexicon().has(sofraKelimeBuyuk(kelime));
}
