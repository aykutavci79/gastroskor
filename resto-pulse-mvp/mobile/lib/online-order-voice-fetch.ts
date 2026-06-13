import { listOnlineOrderRestaurants } from '@/lib/api';
import type { OnlineOrderOpenListResponse } from '@/lib/types';

type VoiceFetchParams = Parameters<typeof listOnlineOrderRestaurants>[0];

/** Sesli urun aramasi — sehir ve mesafe daraltmasi bos donerse genislet. */
export async function fetchVoiceProductRestaurants(
  params: VoiceFetchParams,
): Promise<{ response: OnlineOrderOpenListResponse; expandedSearch: boolean }> {
  const primary = await listOnlineOrderRestaurants({
    ...params,
    city: params.city ?? undefined,
  });
  const primaryItems = Array.isArray(primary.items) ? primary.items : [];
  if (primaryItems.length > 0) {
    return { response: primary, expandedSearch: false };
  }

  const withoutCity = await listOnlineOrderRestaurants({
    ...params,
    city: undefined,
  });
  const noCityItems = Array.isArray(withoutCity.items) ? withoutCity.items : [];
  if (noCityItems.length > 0) {
    return { response: withoutCity, expandedSearch: true };
  }

  if (params.max_distance_km != null) {
    const wide = await listOnlineOrderRestaurants({
      ...params,
      city: undefined,
      max_distance_km: undefined,
    });
    return { response: wide, expandedSearch: true };
  }

  return { response: primary, expandedSearch: false };
}
