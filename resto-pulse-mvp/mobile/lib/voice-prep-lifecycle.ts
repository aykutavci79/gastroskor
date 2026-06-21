import { AppState } from 'react-native';

type CancelFn = () => void;

const activeCancels = new Set<CancelFn>();
let appStateSub: ReturnType<typeof AppState.addEventListener> | null = null;

export function registerVoicePrepCancel(cancel: CancelFn): () => void {
  activeCancels.add(cancel);
  return () => {
    activeCancels.delete(cancel);
  };
}

export function cancelAllVoicePrepSessions(): void {
  for (const cancel of [...activeCancels]) {
    cancel();
    activeCancels.delete(cancel);
  }
}

export function ensureVoiceAppStateGuard(onBackground: () => void): void {
  if (appStateSub) return;
  appStateSub = AppState.addEventListener('change', (next) => {
    if (next === 'active') return;
    cancelAllVoicePrepSessions();
    onBackground();
  });
}

/** @internal test reset */
export function __resetVoicePrepLifecycleForTests(): void {
  activeCancels.clear();
  appStateSub?.remove();
  appStateSub = null;
}
