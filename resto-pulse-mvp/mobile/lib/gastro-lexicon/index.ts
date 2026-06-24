import { asciiKelimeAnahtar, sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

import { gastroYazilisByAscii as yazilisMapExport } from '@/lib/gastro-lexicon/yazilis';

type WordListFile = { count: number; words: string[] };

let manifestCache: typeof import('@/data/gastro-lexicon/manifest.json') | null = null;
let tahmin5Cache: readonly string[] | null = null;
let cevap5Cache: readonly string[] | null = null;
let fullSetCache: ReadonlySet<string> | null = null;
let fullAsciiCache: ReadonlySet<string> | null = null;

function manifest() {
  if (!manifestCache) {
    manifestCache = require('@/data/gastro-lexicon/manifest.json') as typeof manifestCache;
  }
  return manifestCache!;
}

function tahmin5Words(): readonly string[] {
  if (!tahmin5Cache) {
    const raw = require('@/data/gastro-lexicon/tahmin-5harf.json') as WordListFile;
    tahmin5Cache = raw.words ?? [];
  }
  return tahmin5Cache;
}

function cevap5Words(): readonly string[] {
  if (!cevap5Cache) {
    const raw = require('@/data/gastro-lexicon/cevap-5harf.json') as WordListFile;
    cevap5Cache = raw.words ?? [];
  }
  return cevap5Cache;
}

function fullWords(): readonly string[] {
  const raw = require('@/data/gastro-lexicon/lexicon-full.json') as WordListFile;
  return raw.words ?? [];
}

export function gastroLexiconManifest() {
  return manifest();
}

export function gastroLexiconContentHash(): string {
  return manifest().contentHash ?? 'unknown';
}

export function gastroYazilisByAscii(): Readonly<Record<string, string>> {
  return yazilisMapExport();
}

/** Kanonik Türkçe yazım — gastro yazılış haritası + ham kelime. */
export function gastroKanonikKelime(raw: string): string {
  const buyuk = sofraKelimeBuyuk(raw);
  const key = asciiKelimeAnahtar(buyuk);
  const mapped = gastroYazilisByAscii()[key] ?? buyuk;
  return sofraKelimeBuyuk(mapped);
}

export function gastroLexiconTahmin5(): readonly string[] {
  return tahmin5Words();
}

export function gastroLexiconCevap5(): readonly string[] {
  return cevap5Words();
}

function buildFullSet(): ReadonlySet<string> {
  return new Set(fullWords());
}

function buildFullAsciiSet(): ReadonlySet<string> {
  const words = fullWords();
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
