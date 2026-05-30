/** Kus uçusu mesafeden tahmini sure (Google Directions API maliyeti yok). */
export function estimateTravelMinutes(distanceMeters: number): { walkMin: number; driveMin: number } {
  const m = Math.max(0, distanceMeters);
  const walkMin = Math.max(1, Math.round(m / 83.3));
  const driveMin = Math.max(1, Math.round(m / 467));
  return { walkMin, driveMin };
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
