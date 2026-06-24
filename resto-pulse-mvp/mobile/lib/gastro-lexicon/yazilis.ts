import yazilisByAsciiJson from '@/data/gastro-lexicon/yazilis-by-ascii.json';

/** Yalnızca yazılış haritası — Sofra havuzu full lexicon yüklemeden eşleşsin. */
export function gastroYazilisByAscii(): Readonly<Record<string, string>> {
  return yazilisByAsciiJson as Record<string, string>;
}
