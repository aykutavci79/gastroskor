import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gastroskor.hub-sfx.enabled.v1';

let cachedEnabled = true;
let cacheLoaded = false;
let warmPromise: Promise<boolean> | null = null;

type Listener = (enabled: boolean) => void;
const listeners = new Set<Listener>();

function notify(enabled: boolean): void {
  for (const listener of listeners) {
    listener(enabled);
  }
}

export function isHubSfxEnabled(): boolean {
  return cachedEnabled;
}

export async function readHubSfxEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === 'false') return false;
  return true;
}

export async function warmHubSfxPreference(): Promise<boolean> {
  if (cacheLoaded) return cachedEnabled;
  if (warmPromise) return warmPromise;

  warmPromise = (async () => {
    try {
      cachedEnabled = await readHubSfxEnabled();
      cacheLoaded = true;
      return cachedEnabled;
    } catch {
      cachedEnabled = true;
      cacheLoaded = true;
      return cachedEnabled;
    } finally {
      warmPromise = null;
    }
  })();

  return warmPromise;
}

export async function setHubSfxEnabled(enabled: boolean): Promise<void> {
  cachedEnabled = enabled;
  cacheLoaded = true;
  await AsyncStorage.setItem(KEY, enabled ? 'true' : 'false');
  notify(enabled);
}

export function subscribeHubSfxEnabled(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
