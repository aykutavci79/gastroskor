/** Platform varsayilan getirme baremi — API `delivery_fee_tl` yoksa mesafeden hesapla. */

const DEFAULT_TIERS = [
  { maxKm: 2, feeTl: 35 },
  { maxKm: 5, feeTl: 50 },
  { maxKm: 8, feeTl: 75 },
  { maxKm: 12, feeTl: 95 },
] as const;

export function resolveDeliveryFeeTl(distanceMeters: number | null | undefined): number | null {
  if (distanceMeters == null || Number.isNaN(distanceMeters)) return null;
  const km = Math.max(0, distanceMeters / 1000);
  for (const tier of DEFAULT_TIERS) {
    if (km <= tier.maxKm) return tier.feeTl;
  }
  return DEFAULT_TIERS[DEFAULT_TIERS.length - 1]?.feeTl ?? null;
}

export function formatDeliveryFeeLabel(feeTl: number): string {
  return `Getirme ${Math.round(feeTl)} ₺`;
}
