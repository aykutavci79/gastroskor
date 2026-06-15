import { normalizeTrSpeechText } from '@/lib/turkish-text-fold';
import { isJunkSpeechTranscript } from '@/lib/speech-transcript-quality';
import { applyVoiceSttPhraseFixes } from '@/lib/voice-stt-phrase-fixes';

export { isJunkSpeechTranscript as isVoiceOrderJunkTranscript };

const ORDER_SEARCH_BOILERPLATE: RegExp[] = [
  /\s+ara(r\s+m[ıi]s[ıi]n)?\.?\s*$/gi,
  /\s+arar\s+m[ıi]s[ıi]n\.?\s*$/gi,
  /\s+bul\.?\s*$/gi,
  /\s+getir\.?\s*$/gi,
];

function stripOrderSearchBoilerplate(text: string): string {
  let out = text.replace(/\.+$/, '').trim();
  for (const pattern of ORDER_SEARCH_BOILERPLATE) {
    out = out.replace(pattern, '').trim();
  }
  return out;
}

export function polishVoiceOrderQueryTranscript(raw: string): string {
  let text = normalizeTrSpeechText(raw);
  if (!text || isJunkSpeechTranscript(text)) return '';
  text = applyVoiceSttPhraseFixes(text);
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
