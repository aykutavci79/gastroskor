import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const PHONE_KEY = 'gastroskor.order.phone.v1';
const ADDRESS_KEY = 'gastroskor.order.address.v1';
const LEGACY_PHONE_KEY = 'gastroskor_order_phone';
const LEGACY_ADDRESS_KEY = 'gastroskor_order_address';

async function migrateLegacyValue(legacyKey: string, secureKey: string): Promise<string | null> {
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (!legacy?.trim()) return null;

  const trimmed = legacy.trim();
  try {
    await SecureStore.setItemAsync(secureKey, trimmed);
    await AsyncStorage.removeItem(legacyKey);
  } catch {
    /* SecureStore erisilemezse legacy degeri kullan; bir sonraki yazimda migrate edilir */
  }
  return trimmed;
}

async function readSecureValue(secureKey: string, legacyKey: string): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(secureKey);
    if (stored?.trim()) return stored.trim();
  } catch {
    /* Keychain/Keystore hatasi — legacy migrate dene */
  }
  return migrateLegacyValue(legacyKey, secureKey);
}

export async function readStoredOrderPhone(): Promise<string | null> {
  return readSecureValue(PHONE_KEY, LEGACY_PHONE_KEY);
}

export async function readStoredOrderAddress(): Promise<string | null> {
  return readSecureValue(ADDRESS_KEY, LEGACY_ADDRESS_KEY);
}

export async function writeStoredOrderPhone(phone: string): Promise<void> {
  const trimmed = phone.trim();
  if (!trimmed) {
    await clearStoredOrderPhone();
    return;
  }
  await SecureStore.setItemAsync(PHONE_KEY, trimmed);
  await AsyncStorage.removeItem(LEGACY_PHONE_KEY).catch(() => undefined);
}

export async function writeStoredOrderAddress(address: string): Promise<void> {
  const trimmed = address.trim();
  if (!trimmed) {
    await clearStoredOrderAddress();
    return;
  }
  await SecureStore.setItemAsync(ADDRESS_KEY, trimmed);
  await AsyncStorage.removeItem(LEGACY_ADDRESS_KEY).catch(() => undefined);
}

export async function clearStoredOrderPhone(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PHONE_KEY);
  } catch {
    /* sessiz */
  }
  await AsyncStorage.removeItem(LEGACY_PHONE_KEY).catch(() => undefined);
}

export async function clearStoredOrderAddress(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(ADDRESS_KEY);
  } catch {
    /* sessiz */
  }
  await AsyncStorage.removeItem(LEGACY_ADDRESS_KEY).catch(() => undefined);
}

/** Cikis / hesap silme — cihazdaki siparis PII onbellegini temizle. */
export async function clearStoredOrderContact(): Promise<void> {
  await Promise.all([clearStoredOrderPhone(), clearStoredOrderAddress()]);
}
