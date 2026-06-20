import besHarfHavuz from '@/data/gunluk-kelime/bes-harf-havuz.json';
import yazilisMap from '@/data/kelime-sofrasi/kelime-yazilis.json';
import { asciiKelimeAnahtar, sofraKelimeBuyuk, sofraKelimeGecerli } from '@/lib/kelime-sofrasi/turkce-harf';

import { GUNLUK_KELIME_LENGTH } from '@/constants/gunluk-kelime';
import { gunlukKelimeGraphemes } from '@/lib/gunluk-kelime/grapheme';

function canonicalBesHarf(raw: string): string {
  const ascii = sofraKelimeBuyuk(raw);
  const mapped = (yazilisMap as Record<string, string>)[ascii] ?? ascii;
  return sofraKelimeBuyuk(mapped);
}

const CANONICAL_BY_ASCII = new Map<string, string>();

for (const raw of besHarfHavuz.words ?? []) {
  try {
    const canon = canonicalBesHarf(String(raw));
    if (gunlukKelimeGraphemes(canon).length !== GUNLUK_KELIME_LENGTH || !sofraKelimeGecerli(canon)) {
      continue;
    }
    CANONICAL_BY_ASCII.set(asciiKelimeAnahtar(canon), canon);
  } catch {
    // bozuk havuz satiri
  }
}

const ALL_WORDS: readonly string[] = [...CANONICAL_BY_ASCII.values()].sort();

export function gunlukKelimeSozluk(): readonly string[] {
  return ALL_WORDS;
}

export function gunlukKelimeGecerliMi(word: string): boolean {
  try {
    if (gunlukKelimeGraphemes(word).length !== GUNLUK_KELIME_LENGTH) return false;
    const norm = gunlukKelimeGraphemes(word).join('');
    return CANONICAL_BY_ASCII.has(asciiKelimeAnahtar(norm));
  } catch {
    return false;
  }
}

/** Sözlükteki kanonik yazım (İ/Ş/Ğ doğru). */
export function gunlukKelimeKanonik(word: string): string | null {
  try {
    if (gunlukKelimeGraphemes(word).length !== GUNLUK_KELIME_LENGTH) return null;
    const norm = gunlukKelimeGraphemes(word).join('');
    return CANONICAL_BY_ASCII.get(asciiKelimeAnahtar(norm)) ?? null;
  } catch {
    return null;
  }
}
