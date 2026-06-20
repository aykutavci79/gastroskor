import { GUNLUK_KELIME_LENGTH } from '@/constants/gunluk-kelime';
import { sofraKelimeBuyuk } from '@/lib/kelime-sofrasi/turkce-harf';

export function gunlukKelimeGraphemes(raw: string): string[] {
  try {
    if (typeof raw !== 'string') return [];
    return [...sofraKelimeBuyuk(raw)];
  } catch {
    return [];
  }
}

export function gunlukKelimeHarfSayisi(raw: string): number {
  return gunlukKelimeGraphemes(raw).length;
}

export function gunlukKelimeFromGraphemes(chars: readonly string[]): string {
  return chars.join('');
}

export function gunlukKelimeAppendHarf(current: string, key: string): string {
  const chars = gunlukKelimeGraphemes(current);
  if (chars.length >= GUNLUK_KELIME_LENGTH) {
    return gunlukKelimeFromGraphemes(chars);
  }
  const harf = gunlukKelimeGraphemes(key)[0];
  if (!harf) return gunlukKelimeFromGraphemes(chars);
  return gunlukKelimeFromGraphemes([...chars, harf]);
}

export function gunlukKelimeBackspace(current: string): string {
  const chars = gunlukKelimeGraphemes(current);
  chars.pop();
  return gunlukKelimeFromGraphemes(chars);
}
