import type { FloorPlanTable } from '@/lib/types';

export const ZONE_CODE: Record<FloorPlanTable['zone'], string> = {
  salon: 'S',
  bahce: 'B',
  teras: 'T',
};

export const ZONE_LABEL: Record<string, string> = {
  salon: 'Salon',
  bahce: 'Bahce',
  teras: 'Teras',
};

/** Restoran–musteri ortak masa kodu: S-M12, B-M3, T-M7 */
export function formatTableCode(zone: string, label: string): string {
  const z = ZONE_CODE[zone as FloorPlanTable['zone']] ?? zone.charAt(0).toUpperCase();
  const clean = label.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) return z;
  if (clean.startsWith(`${z}-`) || clean.startsWith(`${z}`)) return clean.includes('-') ? clean : `${z}-${clean}`;
  return `${z}-${clean}`;
}

export function formatTableCodeLong(zone: string, label: string): string {
  const zoneName = ZONE_LABEL[zone] ?? zone;
  return `${zoneName} · ${formatTableCode(zone, label)}`;
}

/** Masa ustu etiket — salon planinda sadece numara/ad. */
export function tableSurfaceLabel(label: string): string {
  const clean = label.trim();
  if (!clean) return '?';
  return clean.replace(/^([SBT])-?/i, '').trim() || clean;
}
