import {
  addSslPinningErrorListener,
  initializeSslPinning,
  isSslPinningAvailable,
} from 'react-native-ssl-public-key-pinning';

const API_HOST = 'api.gastroskor.com.tr';

export const SSL_PINNING_USER_MESSAGE =
  'Guvenlik dogrulamasi basarisiz. Lutfen uygulamayi App Store / Play Store uzerinden guncelleyin.';

let pinningSetup: Promise<void> | null = null;
let pinningFailureActive = false;
let pinningInitialized = false;

function isPinningEnforced(): boolean {
  return !__DEV__ && process.env.EXPO_PUBLIC_SSL_PINNING_ENABLED === 'true';
}

export function isSslPinningFailureActive(): boolean {
  return pinningFailureActive;
}

export function registerSslPinningErrorListener(): () => void {
  if (!isSslPinningAvailable()) return () => undefined;

  const subscription = addSslPinningErrorListener(() => {
    pinningFailureActive = true;
  });

  return () => subscription.remove();
}

export function isLikelySslPinningError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    pinningFailureActive ||
    normalized.includes('certificate pinning') ||
    normalized.includes('pin verification') ||
    normalized.includes('pinning failure') ||
    normalized.includes('trustkit') ||
    normalized.includes('public key pin')
  );
}

function readPinHashes(): string[] {
  const primary = process.env.EXPO_PUBLIC_API_SSL_PIN_PRIMARY?.trim();
  const backup = process.env.EXPO_PUBLIC_API_SSL_PIN_BACKUP?.trim();
  return [primary, backup].filter((value): value is string => Boolean(value));
}

export function setupSslPinning(): Promise<void> {
  if (pinningSetup) return pinningSetup;

  pinningSetup = (async () => {
    if (!isPinningEnforced()) return;
    if (!isSslPinningAvailable()) {
      pinningFailureActive = true;
      console.error('[ssl-pinning] Native modul yok; guvenli API baglantisi kurulamaz.');
      return;
    }

    const hashes = readPinHashes();
    if (hashes.length < 2) {
      pinningFailureActive = true;
      console.error('[ssl-pinning] Primary ve backup pin eksik; guvenli API baglantisi kurulamaz.');
      return;
    }

    try {
      await initializeSslPinning({
        [API_HOST]: {
          includeSubdomains: false,
          publicKeyHashes: hashes,
        },
      });
      pinningInitialized = true;
    } catch (error) {
      pinningFailureActive = true;
      console.error('[ssl-pinning] Baslatilamadi; guvenli API baglantisi kurulamaz.', error);
    }
  })();

  return pinningSetup;
}

/** Production + pinning acikken init basarisizsa API isteklerini engelle. */
export async function ensureSslPinningReady(): Promise<void> {
  await setupSslPinning();
  if (!isPinningEnforced()) return;
  if (!pinningInitialized) {
    throw new Error(SSL_PINNING_USER_MESSAGE);
  }
}
