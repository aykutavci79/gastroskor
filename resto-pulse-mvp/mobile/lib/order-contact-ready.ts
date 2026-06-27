import { getOrderPhoneStatus } from '@/lib/api';
import { readStoredOrderAddress, readStoredOrderPhone } from '@/lib/order-contact-secure-storage';
import { normalizeTrMobileInput } from '@/lib/phone-tr';

export type OrderContactSnapshot = {
  ready: boolean;
  phone: string | null;
  phoneVerified: boolean;
  verifiedPhoneE164: string | null;
  address: string | null;
};

export async function loadOrderContactSnapshot(userEmail: string | null): Promise<OrderContactSnapshot> {
  const [storedPhone, storedAddress, status] = await Promise.all([
    readStoredOrderPhone().catch(() => null),
    readStoredOrderAddress().catch(() => null),
    userEmail ? getOrderPhoneStatus(userEmail).catch(() => null) : Promise.resolve(null),
  ]);

  const verified = Boolean(status?.verified && status.phone_e164);
  const phone = storedPhone?.trim() || null;
  const address = storedAddress?.trim() || null;
  const verifiedPhoneE164 = verified ? status?.phone_e164 ?? null : null;
  const phoneMatches =
    verified &&
    verifiedPhoneE164 &&
    phone &&
    normalizeTrMobileInput(phone) === verifiedPhoneE164;

  return {
    ready: Boolean(phoneMatches && address && address.length >= 10),
    phone,
    phoneVerified: Boolean(phoneMatches),
    verifiedPhoneE164,
    address,
  };
}
