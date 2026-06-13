import { foldTrAscii, normalizeTrSpeechText } from '@/lib/turkish-text-fold';

const ORDER_PHRASE_FIXES: Array<[RegExp, string]> = [
  [/\bbe\s*den\b/gi, "b'den"],
  [/\bbe\s*dan\b/gi, "b'den"],
  [/\ba\s*den\b/gi, "a'den"],
  [/\ba\s*dan\b/gi, "a'den"],
  [/\bc\s*den\b/gi, "c'den"],
  [/\bc\s*dan\b/gi, "c'den"],
  [/\bkapida\b/gi, 'kapıda'],
  [/\bkredi\s*kart\b/gi, 'kredi kartı'],
  [/\bnakit\b/gi, 'nakit'],
  [/\bcantic\b/gi, 'cantık'],
  [/\bcantik\b/gi, 'cantık'],
  [/\blahmacun\b/gi, 'lahmacun'],
  [/\buc\s*adet\b/gi, '3 adet'],
  [/\büç\s*adet\b/gi, '3 adet'],
  [/\biki\s*adet\b/gi, '2 adet'],
  [/\bbir\s*adet\b/gi, '1 adet'],
];

/** Whisper sessizlikte sik uydurdugu ifadeler — taslaga yazma. */
const JUNK_TRANSCRIPT_PATTERNS: RegExp[] = [
  /\bizlediginiz\s+i(cin|çin)\s+tesekkur/,
  /\btesekkur\s+ederim\b/,
  /\babone\s+ol(un)?\b/,
  /\bthank\s+you\s+for\s+watching\b/,
  /\bplease\s+subscribe\b/,
  /^m\.?\s*k\.?$/,
  /^[\p{L}]\.[\p{L}]\.?$/u,
];

const ORDER_SEARCH_BOILERPLATE: RegExp[] = [
  /\s+ara(r\s+m[ıi]s[ıi]n)?\.?\s*$/gi,
  /\s+arar\s+m[ıi]s[ıi]n\.?\s*$/gi,
  /\s+bul\.?\s*$/gi,
  /\s+getir\.?\s*$/gi,
];

export function isVoiceOrderJunkTranscript(raw: string): boolean {
  const text = foldTrAscii(normalizeTrSpeechText(raw));
  if (!text) return true;
  if (text.length <= 2) return true;
  if (/^[.\s,;:!?-]+$/.test(text)) return true;
  return JUNK_TRANSCRIPT_PATTERNS.some((pattern) => pattern.test(text));
}

function stripOrderSearchBoilerplate(text: string): string {
  let out = text.replace(/\.+$/, '').trim();
  for (const pattern of ORDER_SEARCH_BOILERPLATE) {
    out = out.replace(pattern, '').trim();
  }
  return out;
}

export function polishVoiceOrderQueryTranscript(raw: string): string {
  let text = normalizeTrSpeechText(raw);
  if (!text || isVoiceOrderJunkTranscript(text)) return '';
  for (const [pattern, replacement] of ORDER_PHRASE_FIXES) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/\s{2,}/g, ' ').trim();
  return stripOrderSearchBoilerplate(text);
}

export function polishVoiceOrderCommandTranscript(raw: string): string {
  return polishVoiceOrderQueryTranscript(raw);
}

export type VoiceOrderConfirmIntent = 'confirm' | 'cancel';

export function parseVoiceOrderConfirmIntent(raw: string): VoiceOrderConfirmIntent | null {
  const text = normalizeTrSpeechText(raw);
  if (!text) return null;
  if (/\b(onayla|onayliyorum|onaylıyorum|evet|tamam|gönder|gonder|siparis\s*ver|sipariş\s*ver)\b/.test(text)) {
    return 'confirm';
  }
  if (/\b(vazgec|vazgeç|iptal|hayir|hayır|dur)\b/.test(text)) {
    return 'cancel';
  }
  return null;
}
