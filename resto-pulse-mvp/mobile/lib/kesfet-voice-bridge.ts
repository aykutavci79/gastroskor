/** Tab bar mic FAB → Keşfet ses overlay (index ekranı kayıt olur). */
let openVoiceOverlay: (() => void) | null = null;

export function registerKesfetVoiceOpener(fn: () => void) {
  openVoiceOverlay = fn;
}

export function unregisterKesfetVoiceOpener(fn: () => void) {
  if (openVoiceOverlay === fn) openVoiceOverlay = null;
}

export function openKesfetVoiceOverlay() {
  openVoiceOverlay?.();
}
