import { normalizeTrSpeechText } from '@/lib/turkish-text-fold';

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

export function polishVoiceOrderQueryTranscript(raw: string): string {
  let text = normalizeTrSpeechText(raw);
  if (!text) return '';
  for (const [pattern, replacement] of ORDER_PHRASE_FIXES) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s{2,}/g, ' ').trim();
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
