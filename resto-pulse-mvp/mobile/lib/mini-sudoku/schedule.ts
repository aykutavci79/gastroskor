export const ISTANBUL_TZ = 'Europe/Istanbul';

/** Yeni gunluk bulmaca her gun bu saatte (Istanbul) acilir — aksam yemek ritueli. */
export const DAILY_RESET_HOUR = 17;

type IstanbulParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
};

function istanbulParts(now: Date): IstanbulParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ISTANBUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toPuzzleId(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function shiftCalendarDay(year: number, month: number, day: number, deltaDays: number) {
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays, 12));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/**
 * Bulmaca donemi: her gun 17:00 Istanbul'da yenilenir.
 * Ornek: 14 Haziran 16:30 → hala 13 Haziran donemi.
 */
export function activePuzzleId(now = new Date()): string {
  const { year, month, day, hour } = istanbulParts(now);
  if (hour < DAILY_RESET_HOUR) {
    const prev = shiftCalendarDay(year, month, day, -1);
    return toPuzzleId(prev.year, prev.month, prev.day);
  }
  return toPuzzleId(year, month, day);
}

/** Sonraki sifirlama aninin Istanbul takvim gunu (bugun/yarin metni icin). */
export function nextResetCalendarDay(now = new Date()): { year: number; month: number; day: number } {
  const { year, month, day, hour } = istanbulParts(now);
  if (hour < DAILY_RESET_HOUR) {
    return { year, month, day };
  }
  return shiftCalendarDay(year, month, day, 1);
}

export function formatNextResetHint(now = new Date()): string {
  const { year, month, day, hour } = istanbulParts(now);
  const next = nextResetCalendarDay(now);
  const isToday = next.year === year && next.month === month && next.day === day;
  const dayLabel = isToday
    ? 'bugün'
    : new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        timeZone: ISTANBUL_TZ,
      }).format(new Date(Date.UTC(next.year, next.month - 1, next.day, 12)));
  if (hour >= DAILY_RESET_HOUR) {
    return `Yeni bulmaca yarın ${DAILY_RESET_HOUR}:00'te`;
  }
  return `Yeni bulmaca ${dayLabel} ${DAILY_RESET_HOUR}:00'te`;
}

export function formatPuzzlePeriodLabel(puzzleId: string): string {
  const [y, m, d] = puzzleId.split('-').map(Number);
  if (!y || !m || !d) return puzzleId;
  const start = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: ISTANBUL_TZ,
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  const endParts = shiftCalendarDay(y, m, d, 1);
  const end = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    timeZone: ISTANBUL_TZ,
  }).format(new Date(Date.UTC(endParts.year, endParts.month - 1, endParts.day, 12)));
  return `${start} 17:00 – ${end} 17:00`;
}
