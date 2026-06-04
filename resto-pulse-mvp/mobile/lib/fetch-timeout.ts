/** React Native / Expo Go'da AbortSignal.timeout yok; fetch icin uyumlu timeout. */
export function createFetchTimeoutSignal(ms: number, parent?: AbortSignal | null): AbortSignal {
  if (parent) return parent;
  const AbortSignalCtor = globalThis.AbortSignal as typeof AbortSignal | undefined;
  if (AbortSignalCtor && typeof AbortSignalCtor.timeout === 'function') {
    return AbortSignalCtor.timeout(ms);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof controller.signal.addEventListener === 'function') {
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  }
  return controller.signal;
}
