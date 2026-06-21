import { Redirect, useLocalSearchParams } from 'expo-router';

/** Universal Link: https://www.gastroskor.com.tr/restaurants/{uuid} */
export default function RestaurantsUniversalLinkScreen() {
  const params = useLocalSearchParams();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    return <Redirect href="/(tabs)" />;
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'id' || value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  return <Redirect href={suffix ? `/restaurant/${encodeURIComponent(id)}?${suffix}` : `/restaurant/${encodeURIComponent(id)}`} />;
}
