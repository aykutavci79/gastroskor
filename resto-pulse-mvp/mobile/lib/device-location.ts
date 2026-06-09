import * as Location from 'expo-location';

export type DeviceCoords = { lat: number; lng: number };

const DEFAULT_TIMEOUT_MS = 8_000;

function toCoords(position: Location.LocationObject): DeviceCoords {
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/** iOS'ta getCurrentPositionAsync bazen takilir; once cache, sonra timeout'lu GPS. */
export async function resolveDeviceCoords(options?: {
  timeoutMs?: number;
  requestPermission?: boolean;
}): Promise<DeviceCoords | null> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let status = (await Location.getForegroundPermissionsAsync()).status;
  if (status !== 'granted' && options?.requestPermission) {
    status = (await Location.requestForegroundPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000 });
    if (last) return toCoords(last);
  } catch {
    /* cache yok */
  }

  try {
    const current = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (current) return toCoords(current);
  } catch {
    /* GPS basarisiz */
  }

  return null;
}
