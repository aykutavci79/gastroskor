import { foldTrAscii, normalizeTrSpeechText } from '@/lib/turkish-text-fold';

/** STT bos/yanlis oturumlarda uydurdugu kisa ifadeler — UI'ya yazma. */
const JUNK_TRANSCRIPT_PATTERNS: RegExp[] = [
  /\bizlediginiz\s+i(cin|çin)\s+tesekkur/,
  /\btesekkur\s+ederim\b/,
  /\babone\s+ol(un)?\b/,
  /\bthank\s+you\s+for\s+watching\b/,
  /\bplease\s+subscribe\b/,
  /^m\.?\s*k\.?$/,
  /^[\p{L}]\.[\p{L}]\.?$/u,
  /^[\p{L}]\s+[\p{L}]$/u,
  /^(hm+|eh+|ah+|oh+|mm+|uh+)$/,
  /^(dinliyorum|dinlerim)$/,
];

function isSingleLetterInitialism(text: string): boolean {
  const parts = text.split(/[\s.]+/).filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length === 1);
}

export function isJunkSpeechTranscript(raw: string): boolean {
  const text = foldTrAscii(normalizeTrSpeechText(raw));
  if (!text) return true;
  if (text.length <= 2) return true;
  if (/^[.\s,;:!?-]+$/.test(text)) return true;
  if (isSingleLetterInitialism(text)) return true;

  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => isJunkSpeechTranscript(token))) {
    return true;
  }

  return JUNK_TRANSCRIPT_PATTERNS.some((pattern) => pattern.test(text));
}

/** Gosterim icin: junk ise bos don. */
export function speechTranscriptForDisplay(raw: string): string {
  const text = normalizeTrSpeechText(raw).trim();
  if (!text || isJunkSpeechTranscript(text)) return '';
  return text;
}
