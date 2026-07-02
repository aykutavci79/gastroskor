import * as SecureStore from 'expo-secure-store';

import type { StoredDeliveryAddress } from '@/lib/delivery-address-types';

const KEY = 'gastroskor.order.delivery_address.v3';

export async function readStoredDeliveryAddress(): Promise<StoredDeliveryAddress | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw?.trim()) return null;
    const parsed = JSON.parse(raw) as StoredDeliveryAddress;
    if (
      !parsed?.streetNodeId ||
      !parsed?.doorNumber?.trim() ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number' ||
      !parsed.formatted?.trim()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredDeliveryAddress(address: StoredDeliveryAddress): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(address));
}

export async function clearStoredDeliveryAddress(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* sessiz */
  }
}
