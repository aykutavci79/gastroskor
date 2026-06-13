import { foldTrAscii } from '@/lib/turkish-text-fold';
import { polishVoiceSearchTranscript } from '@/lib/voice-search-stt-fix';

export type KesfetVoiceNavigationIntent = {
  kind: 'online_order';
  /** "online siparis 150 TL lahmacun" gibi cumlelerde urun kismi */
  orderText?: string;
};

const ONLINE_ORDER_ONLY = new RegExp(
  '^(?:online\\s+siparis|gastro\\s+siparis)(?:\\s+ver)?(?:\\s+(?:ac|git|ekrana?|sayfaya?|lutfen|lütfen))?\\s*$',
);

const SIPARIS_VER_ONLY = /^siparis\s+ver(?:\s+online)?\s*$/;

const ONLINE_ORDER_PREFIX = /^(?:online\s+siparis(?:\s+ver)?|gastro\s+siparis(?:\s+ver)?)\s+(.+)$/;

/** Keşfet ses overlay — handsfree ekran gecisi (online siparis vb.). */
export function parseKesfetVoiceNavigationIntent(raw: string): KesfetVoiceNavigationIntent | null {
  const polished = polishVoiceSearchTranscript(raw);
  if (!polished) return null;

  const folded = foldTrAscii(polished);
  if (!folded) return null;

  if (ONLINE_ORDER_ONLY.test(folded) || SIPARIS_VER_ONLY.test(folded)) {
    return { kind: 'online_order' };
  }

  const tailMatch = folded.match(ONLINE_ORDER_PREFIX);
  if (tailMatch?.[1]?.trim()) {
    return { kind: 'online_order', orderText: tailMatch[1].trim() };
  }

  return null;
}
