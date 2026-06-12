/** Turkce metin — konusma/yazim farklari icin ASCII yakinlastirma. */

export function normalizeTrSpeechText(value: string): string {
  const input = typeof value === 'string' ? value : '';
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}\s.,]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** sütlaç ~ sutlac, cantık ~ cantik, şişe ~ sise */
export function foldTrAscii(value: string): string {
  return normalizeTrSpeechText(value)
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function textIncludesTrFolded(haystack: string, needle: string, minNeedleLen = 3): boolean {
  const foldedHaystack = foldTrAscii(haystack);
  const foldedNeedle = foldTrAscii(needle);
  if (!foldedNeedle || foldedNeedle.length < minNeedleLen) return false;
  return foldedHaystack.includes(foldedNeedle);
}

/**
 * iOS TTS ozel harfleri (o, u, s, …) tek tek okuyabiliyor.
 * Konusma icin ASCII yakinlastirma — ekranda orijinal metin kalir.
 */
export function prepareTurkishSpeechText(value: string): string {
  const input = typeof value === 'string' ? value : '';
  return foldTrAscii(input)
    .replace(/[&/\\|+_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
