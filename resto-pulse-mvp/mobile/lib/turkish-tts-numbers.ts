const ONES = ['', 'bir', 'iki', 'uc', 'dort', 'bes', 'alti', 'yedi', 'sekiz', 'dokuz'] as const;
const TENS = ['', 'on', 'yirmi', 'otuz', 'kirk', 'elli', 'altmis', 'yetmis', 'seksen', 'doksan'] as const;

export function integerToTurkishSpeech(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'sifir';
  if (n < 10) return ONES[n] ?? String(n);
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const hundredWord = hundreds === 1 ? 'yuz' : `${ONES[hundreds]} yuz`;
    return rest ? `${hundredWord} ${integerToTurkishSpeech(rest)}` : hundredWord;
  }
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const thousandWord = thousands === 1 ? 'bin' : `${integerToTurkishSpeech(thousands)} bin`;
    return rest ? `${thousandWord} ${integerToTurkishSpeech(rest)}` : thousandWord;
  }
  return String(n);
}

export function decimalToTurkishSpeech(raw: string): string {
  const normalized = raw.trim().replace(',', '.');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return raw;

  const int = Math.floor(num);
  const fracDigit = Math.round((num - int) * 10);

  if (fracDigit === 5) {
    return int === 0 ? 'yarim' : `${integerToTurkishSpeech(int)} bucuk`;
  }
  if (fracDigit === 0) {
    return integerToTurkishSpeech(int);
  }
  return `${integerToTurkishSpeech(int)} virgul ${integerToTurkishSpeech(fracDigit)}`;
}

/** Rakamlari TTS icin Turkce kelimeye cevir — Ingilizce "one fifty" onlenir. */
export function applyTurkishTtsNumberWords(text: string): string {
  return text.replace(/\d+(?:[.,]\d+)?/g, (match) => decimalToTurkishSpeech(match));
}
