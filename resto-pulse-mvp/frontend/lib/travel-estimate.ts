/** Kuş uçusu mesafeden tahmini süre (Google Directions API maliyeti yok). */
export function estimateTravelMinutes(distanceMeters: number): { walkMin: number; driveMin: number } {
  const m = Math.max(0, distanceMeters);
  // Yürüme ~5 km/saat; şehir içi araç ~28 km/saat
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
