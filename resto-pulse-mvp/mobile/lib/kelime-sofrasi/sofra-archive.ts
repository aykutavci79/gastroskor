import { SOFRA_ARCHIVE_EPOCH, SOFRA_ARCHIVE_MAX_DAYS } from '@/constants/kelime-sofrasi';
import { activePuzzleId, ISTANBUL_TZ } from '@/lib/mini-sudoku/schedule';

export type SofraArchiveBounds = {
  minGunId: string;
  maxGunId: string;
  activeGunId: string;
};

const GUN_ID_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseGunIdParts(gunId: string): { year: number; month: number; day: number } {
  const [year, month, day] = gunId.split('-').map(Number);
  return { year, month, day };
}

function toGunId(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftGunId(gunId: string, deltaDays: number): string {
  const { year, month, day } = parseGunIdParts(gunId);
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays, 12));
  return toGunId(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function sofraArchiveBounds(now = new Date()): SofraArchiveBounds {
  const activeGunId = activePuzzleId(now);
  const minByLookback = shiftGunId(activeGunId, -SOFRA_ARCHIVE_MAX_DAYS);
  const minGunId = minByLookback < SOFRA_ARCHIVE_EPOCH ? SOFRA_ARCHIVE_EPOCH : minByLookback;
  return { minGunId, maxGunId: activeGunId, activeGunId };
}

export function clampSofraGunId(gunId: string | undefined | null, now = new Date()): string {
  const { minGunId, maxGunId, activeGunId } = sofraArchiveBounds(now);
  if (!gunId || !GUN_ID_RE.test(gunId)) return activeGunId;
  if (gunId < minGunId) return minGunId;
  if (gunId > maxGunId) return maxGunId;
  return gunId;
}

export function isSofraGunIdSelectable(gunId: string, now = new Date()): boolean {
  const { minGunId, maxGunId } = sofraArchiveBounds(now);
  return GUN_ID_RE.test(gunId) && gunId >= minGunId && gunId <= maxGunId;
}

export function isSofraArchiveDay(gunId: string, now = new Date()): boolean {
  return gunId !== sofraArchiveBounds(now).activeGunId;
}

export function formatSofraGunIdLong(gunId: string): string {
  const { year, month, day } = parseGunIdParts(gunId);
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: ISTANBUL_TZ,
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatSofraMonthYear(gunId: string): string {
  const { year, month } = parseGunIdParts(gunId);
  return new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
    timeZone: ISTANBUL_TZ,
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

export const SOFRA_WEEKDAY_LABELS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'] as const;

export type SofraCalendarCell = {
  gunId: string | null;
  inMonth: boolean;
  selectable: boolean;
};

/** Pazartesi baslangicli ay gridi (5-6 satir). */
export function buildSofraMonthGrid(monthGunId: string, now = new Date()): SofraCalendarCell[] {
  const { year, month } = parseGunIdParts(monthGunId);
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const mondayIndex = (first.getUTCDay() + 6) % 7;
  const cells: SofraCalendarCell[] = [];

  for (let i = mondayIndex - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, -i, 12));
    const gunId = toGunId(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    cells.push({ gunId, inMonth: false, selectable: isSofraGunIdSelectable(gunId, now) });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const gunId = toGunId(year, month, day);
    cells.push({ gunId, inMonth: true, selectable: isSofraGunIdSelectable(gunId, now) });
  }

  let nextDay = 1;
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const d = new Date(Date.UTC(year, month, nextDay, 12));
    const gunId = toGunId(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    cells.push({ gunId, inMonth: false, selectable: isSofraGunIdSelectable(gunId, now) });
    nextDay += 1;
    if (cells.length >= 42) break;
  }

  return cells.slice(0, 42);
}

export function shiftMonthGunId(monthGunId: string, deltaMonths: number): string {
  const { year, month } = parseGunIdParts(monthGunId);
  const shifted = new Date(Date.UTC(year, month - 1 + deltaMonths, 1, 12));
  return toGunId(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, 1);
}

export function monthGunIdFromGunId(gunId: string): string {
  const { year, month } = parseGunIdParts(gunId);
  return toGunId(year, month, 1);
}

export function canNavigateSofraMonth(monthGunId: string, deltaMonths: number, now = new Date()): boolean {
  const target = shiftMonthGunId(monthGunId, deltaMonths);
  const { minGunId, maxGunId } = sofraArchiveBounds(now);
  const targetParts = parseGunIdParts(target);
  const minParts = parseGunIdParts(minGunId);
  const maxParts = parseGunIdParts(maxGunId);
  const targetKey = targetParts.year * 100 + targetParts.month;
  const minKey = minParts.year * 100 + minParts.month;
  const maxKey = maxParts.year * 100 + maxParts.month;
  return targetKey >= minKey && targetKey <= maxKey;
}
