/** Tab bar mic FAB ↔ Keşfet ses overlay + arama sonucu. */
import { gastroStopSpeaking } from '@/lib/gastro-speak';

let openVoiceOverlay: (() => void) | null = null;
let voiceSearchListener: ((text: string) => void) | null = null;
let pendingVoiceQuery: string | null = null;

export type PendingOnlineOrderVoice = {
  openSheet: boolean;
  orderText?: string;
};

let pendingOnlineOrderVoice: PendingOnlineOrderVoice | null = null;

export function registerKesfetVoiceOpener(fn: () => void) {
  openVoiceOverlay = fn;
}

export function unregisterKesfetVoiceOpener(fn: () => void) {
  if (openVoiceOverlay === fn) openVoiceOverlay = null;
}

export function openKesfetVoiceOverlay() {
  gastroStopSpeaking();
  openVoiceOverlay?.();
}

export function registerKesfetVoiceSearchListener(fn: (text: string) => void) {
  voiceSearchListener = fn;
}

export function unregisterKesfetVoiceSearchListener(fn: (text: string) => void) {
  if (voiceSearchListener === fn) voiceSearchListener = null;
}

export function emitKesfetVoiceSearch(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  if (voiceSearchListener) {
    voiceSearchListener(trimmed);
    return;
  }
  pendingVoiceQuery = trimmed;
}

/** Keşfet ekranı focus olunca bekleyen sesli aramayı tüketir. */
export function consumePendingKesfetVoiceSearch(): string | null {
  const next = pendingVoiceQuery;
  pendingVoiceQuery = null;
  return next;
}

/** Keşfet mic → "online sipariş" handsfree gecisi. */
export function emitKesfetOnlineOrderVoice(options?: { orderText?: string }) {
  pendingOnlineOrderVoice = {
    openSheet: true,
    orderText: options?.orderText?.trim() || undefined,
  };
}

export function consumePendingOnlineOrderVoice(): PendingOnlineOrderVoice | null {
  const next = pendingOnlineOrderVoice;
  pendingOnlineOrderVoice = null;
  return next;
}
