import { foldTrAscii, normalizeTrSpeechText } from '@/lib/turkish-text-fold';

const WORD_ONES: Record<string, number> = {
  bir: 1,
  iki: 2,
  uc: 3,
  üç: 3,
  dort: 4,
  dört: 4,
  bes: 5,
  beş: 5,
  alti: 6,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kirk: 40,
  kırk: 40,
  elli: 50,
  altmis: 60,
  altmış: 60,
  yetmis: 70,
  yetmiş: 70,
  seksen: 80,
  doksan: 90,
};

function parseSpokenNumber(chunk: string): number | null {
  const cleaned = normalizeTrSpeechText(chunk);
  if (!cleaned) return null;

  const digit = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (digit) {
    const n = Number(digit[1].replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  if (/\byuz\b|\byüz\b/.test(cleaned)) {
    const rest = cleaned.replace(/\byuz\b|\byüz\b/g, '').trim();
    if (!rest) return 100;
    const tail = parseSpokenNumber(rest);
    return tail != null ? 100 + tail : 100;
  }

  if (/\biki yuz\b|\biki yüz\b/.test(cleaned)) return 200;
  if (/\buc yuz\b|\büç yüz\b/.test(cleaned)) return 300;

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 1 && WORD_ONES[tokens[0]] != null) {
    return WORD_ONES[tokens[0]];
  }
  if (tokens.length === 2 && tokens[0] === 'yuz' && WORD_ONES[tokens[1]] != null) {
    return 100 + WORD_ONES[tokens[1]];
  }
  if (tokens.length === 2 && WORD_ONES[tokens[0]] != null && WORD_ONES[tokens[1]] != null) {
    return WORD_ONES[tokens[0]] + WORD_ONES[tokens[1]];
  }

  return null;
}

const SPOKEN_PRICE_PHRASES: Array<{ pattern: RegExp; value: number }> = [
  { pattern: /\biki\s*yuz\b/, value: 200 },
  { pattern: /\buc\s*yuz\b/, value: 300 },
  { pattern: /\bdort\s*yuz\b/, value: 400 },
  { pattern: /\bbes\s*yuz\b/, value: 500 },
  { pattern: /\byuz\s*elli\b/, value: 150 },
  { pattern: /\byuz\s*yirmi\b/, value: 120 },
];

export function isVoiceBudgetCeiling(text: string): boolean {
  const folded = foldTrAscii(text);
  return (
    /\bgecmesin\b/.test(folded) ||
    /\bgecmeyecek\b/.test(folded) ||
    /\bgecme\b/.test(folded) ||
    /\basmasin\b/.test(folded) ||
    /\basmayacak\b/.test(folded) ||
    /\basma\b/.test(folded) ||
    /\btl\s*gecmesin\b/.test(folded) ||
    /\bgecmesin\b.*\btl\b/.test(folded) ||
    /\btl\s*(?:i|yi|yı)?\s*gecme\b/.test(folded)
  );
}

export function extractPriceMax(text: string): number | null {
  const folded = foldTrAscii(text);

  const ceiling =
    folded.match(/(\d+(?:[.,]\d+)?)\s*tl(?:yi|yi)?\s*gecmesin/) ??
    folded.match(/gecmesin.*?(\d+(?:[.,]\d+)?)\s*tl/) ??
    folded.match(/(\d+(?:[.,]\d+)?)\s*(?:u|ü)?\s*gecmesin/) ??
    folded.match(/(\d+(?:[.,]\d+)?)\s*(?:u|ü)\s*gecmesin/) ??
    folded.match(/(\d+(?:[.,]\d+)?)\s*tl\s*(?:i|yi|yı)?\s*gecme\b/);
  if (ceiling) {
    const n = Number(ceiling[1].replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }

  if (isVoiceBudgetCeiling(text)) {
    for (const row of SPOKEN_PRICE_PHRASES) {
      if (row.pattern.test(folded)) return row.value;
    }
  }

  for (const row of SPOKEN_PRICE_PHRASES) {
    if (row.pattern.test(folded)) return row.value;
  }

  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*liralik/,
    /(\d+(?:[.,]\d+)?)\s*lik/,
    /(\d+(?:[.,]\d+)?)\s*(?:tl|lira)(?:\s*(?:ye|ya)\s*kadar)?/,
    /(?:en fazla|maksimum|azami)\s*(\d+(?:[.,]\d+)?)\s*(?:tl|lira)?/,
    /(\d+(?:[.,]\d+)?)\s*liraya\s*kadar/,
    /(yuz\s+elli|iki\s+yuz|uc\s+yuz)\s*(?:tl|lira)?/,
  ];
  for (const pattern of patterns) {
    const match = folded.match(pattern);
    if (!match) continue;
    const parsed = parseSpokenNumber(match[1]);
    if (parsed != null && parsed > 0) return parsed;
  }

  if (!isVoiceBudgetCeiling(text)) {
    const bareNumber = folded.match(/\b(\d{2,4})\b/);
    if (bareNumber) {
      const n = Number(bareNumber[1]);
      if (Number.isFinite(n) && n >= 30 && n <= 10_000) return n;
    }
  }

  return null;
}
