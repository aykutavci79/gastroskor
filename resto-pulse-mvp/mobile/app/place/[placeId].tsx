import { Redirect, useLocalSearchParams } from 'expo-router';

/** Universal Link: https://www.gastroskor.com.tr/place/{googlePlaceId} */
export default function PlaceUniversalLinkScreen() {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const rawPlaceId = params.placeId;
  const placeId = Array.isArray(rawPlaceId) ? rawPlaceId[0] : rawPlaceId;
  if (!placeId) {
    return <Redirect href="/(tabs)" />;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'placeId' || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  const encoded = encodeURIComponent(decodeURIComponent(placeId));
  return <Redirect href={suffix ? `/restaurant/${encoded}?${suffix}` : `/restaurant/${encoded}`} />;
}
