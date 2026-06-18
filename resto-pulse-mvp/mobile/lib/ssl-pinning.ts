import {
  initializeSslPinning,
  isSslPinningAvailable,
} from 'react-native-ssl-public-key-pinning';

const API_HOST = 'api.gastroskor.com.tr';

let pinningSetup: Promise<void> | null = null;

function readPinHashes(): string[] {
  const primary = process.env.EXPO_PUBLIC_API_SSL_PIN_PRIMARY?.trim();
  const backup = process.env.EXPO_PUBLIC_API_SSL_PIN_BACKUP?.trim();
  return [primary, backup].filter((value): value is string => Boolean(value));
}

export function setupSslPinning(): Promise<void> {
  if (pinningSetup) return pinningSetup;

  pinningSetup = (async () => {
    if (__DEV__) return;
    if (process.env.EXPO_PUBLIC_SSL_PINNING_ENABLED !== 'true') return;
    if (!isSslPinningAvailable()) return;

    const hashes = readPinHashes();
    if (hashes.length < 2) {
      console.warn('[ssl-pinning] Primary ve backup pin tanimli degil; pinning atlandi.');
      return;
    }

    try {
      await initializeSslPinning({
        [API_HOST]: {
          includeSubdomains: false,
          publicKeyHashes: hashes,
        },
      });
    } catch (error) {
      console.warn('[ssl-pinning] Baslatilamadi; pinning devre disi.', error);
    }
  })();

  return pinningSetup;
}
