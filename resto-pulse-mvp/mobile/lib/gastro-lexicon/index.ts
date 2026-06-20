import manifest from '@/data/gastro-lexicon/manifest.json';
import cevap5Json from '@/data/gastro-lexicon/cevap-5harf.json';
import lexiconFullJson from '@/data/gastro-lexicon/lexicon-full.json';
import tahmin5Json from '@/data/gastro-lexicon/tahmin-5harf.json';
import yazilisByAsciiJson from '@/data/gastro-lexicon/yazilis-by-ascii.json';
import { asciiKelimeAnahtar, sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

type WordListFile = { count: number; words: string[] };

let tahmin5Cache: readonly string[] | null = null;
let cevap5Cache: readonly string[] | null = null;
let fullSetCache: ReadonlySet<string> | null = null;
let fullAsciiCache: ReadonlySet<string> | null = null;

export function gastroLexiconManifest() {
  return manifest;
}

export function gastroLexiconContentHash(): string {
  return manifest.contentHash ?? 'unknown';
}

export function gastroYazilisByAscii(): Readonly<Record<string, string>> {
  return yazilisByAsciiJson as Record<string, string>;
}

/** Kanonik Türkçe yazım — gastro yazılış haritası + ham kelime. */
export function gastroKanonikKelime(raw: string): string {
  const buyuk = sofraKelimeBuyuk(raw);
  const key = asciiKelimeAnahtar(buyuk);
  const mapped = gastroYazilisByAscii()[key] ?? buyuk;
  return sofraKelimeBuyuk(mapped);
}

export function gastroLexiconTahmin5(): readonly string[] {
  if (!tahmin5Cache) {
    tahmin5Cache = (tahmin5Json as WordListFile).words ?? [];
  }
  return tahmin5Cache;
}

export function gastroLexiconCevap5(): readonly string[] {
  if (!cevap5Cache) {
    cevap5Cache = (cevap5Json as WordListFile).words ?? [];
  }
  return cevap5Cache;
}

function buildFullSet(): ReadonlySet<string> {
  const words = (lexiconFullJson as WordListFile).words ?? [];
  return new Set(words.map((w) => sofraKelimeBuyuk(w)));
}

function buildFullAsciiSet(): ReadonlySet<string> {
  const words = (lexiconFullJson as WordListFile).words ?? [];
  return new Set(words.map((w) => asciiKelimeAnahtar(w)));
}

/** Kelime Sofrası ızgara doğrulama + genel TDK seti. */
export function gastroLexiconFullSet(): ReadonlySet<string> {
  if (!fullSetCache) {
    fullSetCache = buildFullSet();
  }
  return fullSetCache;
}

export function gastroLexiconHasKelime(kelime: string): boolean {
  const canon = gastroKanonikKelime(kelime);
  if (gastroLexiconFullSet().has(canon)) return true;
  const ascii = asciiKelimeAnahtar(canon);
  if (!fullAsciiCache) {
    fullAsciiCache = buildFullAsciiSet();
  }
  return fullAsciiCache.has(ascii);
}
