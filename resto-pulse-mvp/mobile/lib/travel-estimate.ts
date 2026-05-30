/** Kus uçusu mesafeden tahmini sure (Google Directions API maliyeti yok). */
export function estimateTravelMinutes(distanceMeters: number): { walkMin: number; driveMin: number } {
  const m = Math.max(0, distanceMeters);
  const walkMin = Math.max(1, Math.round(m / 83.3));
  const driveMin = Math.max(1, Math.round(m / 467));
  return { walkMin, driveMin };
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistanceLabel(item: {
  distance_km?: number | null;
  distance_meters?: number | null;
}): string | null {
  if (item.distance_km != null) {
    return item.distance_km < 1
      ? `${Math.round(item.distance_km * 1000)} m`
      : `${item.distance_km} km`;
  }
  if (item.distance_meters != null && item.distance_meters > 0) {
    return item.distance_meters < 1000
      ? `${Math.round(item.distance_meters)} m`
      : `${(item.distance_meters / 1000).toFixed(1)} km`;
  }
  return null;
}
