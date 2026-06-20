/** React Native / Expo Go'da AbortSignal.timeout guvenilir degil; her zaman manuel controller. */
export function createFetchTimeoutSignal(ms: number, parent?: AbortSignal | null): AbortSignal {
  if (parent) return parent;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof controller.signal.addEventListener === 'function') {
    controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  }
  return controller.signal;
}
