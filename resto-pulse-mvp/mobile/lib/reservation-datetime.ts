export type ReservationSlot = {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
};

const MONTHS_TR = [
  'Ocak',
  'Subat',
  'Mart',
  'Nisan',
  'Mayis',
  'Haziran',
  'Temmuz',
  'Agustos',
  'Eylul',
  'Ekim',
  'Kasim',
  'Aralik',
] as const;

export function monthLabelTr(month: number): string {
  return MONTHS_TR[Math.max(1, Math.min(12, month)) - 1] ?? 'Ay';
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function clampSlotDay(slot: ReservationSlot): ReservationSlot {
  const maxDay = daysInMonth(slot.year, slot.month);
  return { ...slot, day: Math.min(Math.max(1, slot.day), maxDay) };
}

export function defaultReservationSlot(): ReservationSlot {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
  d.setHours(d.getHours() + 2);
  return {
    day: d.getDate(),
    month: d.getMonth() + 1,
    year: d.getFullYear(),
    hour: d.getHours(),
    minute: d.getMinutes(),
  };
}

export function slotToDate(slot: ReservationSlot): Date {
  const safe = clampSlotDay(slot);
  return new Date(safe.year, safe.month - 1, safe.day, safe.hour, safe.minute, 0, 0);
}

export function slotToIso(slot: ReservationSlot): string {
  return slotToDate(slot).toISOString();
}

export function formatSlotDateTr(slot: ReservationSlot): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const safe = clampSlotDay(slot);
  return `${pad(safe.day)}.${pad(safe.month)}.${safe.year}`;
}

export function formatSlotTimeTr(slot: ReservationSlot): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(slot.hour)}:${pad(slot.minute)}`;
}

export function formatSlotDateTimeTr(slot: ReservationSlot): string {
  return `${formatSlotDateTr(slot)} · ${formatSlotTimeTr(slot)}`;
}

export function yearOptions(fromYear = new Date().getFullYear()): number[] {
  return [fromYear, fromYear + 1];
}

export function minuteOptions(step = 5): number[] {
  const out: number[] = [];
  for (let m = 0; m < 60; m += step) out.push(m);
  return out;
}

export { MONTHS_TR };
