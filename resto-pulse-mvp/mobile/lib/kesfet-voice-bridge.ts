/** Tab bar mic FAB ↔ Keşfet ses overlay + arama sonucu. */
let openVoiceOverlay: (() => void) | null = null;
let voiceSearchListener: ((text: string) => void) | null = null;
let pendingVoiceQuery: string | null = null;

export function registerKesfetVoiceOpener(fn: () => void) {
  openVoiceOverlay = fn;
}

export function unregisterKesfetVoiceOpener(fn: () => void) {
  if (openVoiceOverlay === fn) openVoiceOverlay = null;
}

export function openKesfetVoiceOverlay() {
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
