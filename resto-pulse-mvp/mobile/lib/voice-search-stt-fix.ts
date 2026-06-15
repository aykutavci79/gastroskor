import { normalizeTrSpeechText } from '@/lib/turkish-text-fold';
import { isJunkSpeechTranscript } from '@/lib/speech-transcript-quality';
import {
  applyVoiceSttPhraseFixes,
  VOICE_WHISPER_CONTEXT_PHRASES,
} from '@/lib/voice-stt-phrase-fixes';

/** "lahmacun satan restoranlari siralas" -> "lahmacun" */
const SEARCH_BOILERPLATE: RegExp[] = [
  /\s+(?:satan|satanlar)\s+(?:restoran(?:lar(?:ı|i|ını|ini)?)?|yer(?:ler)?(?:i)?)(?:\s+(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste))?\.?\s*$/gi,
  /\s+(?:restoran(?:lar(?:ı|i|ını|ini)?)?)\s+(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste)\.?\s*$/gi,
  /\s+(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste)\.?\s*$/gi,
  /\s+(?:satan|satanlar)\s+(?:restoran(?:lar(?:ı|i)?)?|yer(?:ler)?(?:i)?)\.?\s*$/gi,
  /\s+restoran(?:lar(?:ı|i|ını|ini)?)?\.?\s*$/gi,
];

function stripVoiceSearchBoilerplate(text: string): string {
  let out = text.replace(/\.+$/, '').trim();
  for (const pattern of SEARCH_BOILERPLATE) {
    out = out.replace(pattern, '').trim();
  }
  return out;
}

export function polishVoiceSearchTranscript(raw: string): string {
  let text = normalizeTrSpeechText(raw);
  if (!text || isJunkSpeechTranscript(text)) return '';
  text = applyVoiceSttPhraseFixes(text);
  return stripVoiceSearchBoilerplate(text);
}

/** Android/iOS STT oneri listesi — kesfet arama cumleleri. */
export const KESFET_SEARCH_CONTEXT_PHRASES: string[] = [
  ...VOICE_WHISPER_CONTEXT_PHRASES,
  'en yakın lahmacuncu',
  'en yakın kebapçı',
  'en yakın tatlıcı',
  'kazandibi satan yer',
  '4.5 yıldız üstü',
  '200 yorum üstü',
  'yorum üstü lahmacun',
  'konumuma en yakın',
  'yıldız üstü',
  'online sipariş',
  'gastro sipariş',
  'sipariş ver',
];
