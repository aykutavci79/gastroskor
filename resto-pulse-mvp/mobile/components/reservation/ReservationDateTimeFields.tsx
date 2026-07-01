import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReservationWheelColumn } from '@/components/reservation/ReservationWheelColumn';
import { ReservationTheme } from '@/constants/reservation-theme';
import {
  clampSlotDay,
  daysInMonth,
  formatSlotDateTimeTr,
  minuteOptions,
  monthLabelTr,
  type ReservationSlot,
  yearOptions,
} from '@/lib/reservation-datetime';

type Props = {
  value: ReservationSlot;
  onChange: (slot: ReservationSlot) => void;
  /** Section içinde — çift çerçeve olmasın. */
  embedded?: boolean;
};

export function ReservationDateTimeFields({ value, onChange, embedded = false }: Props) {
  const safe = clampSlotDay(value);
  const years = yearOptions();
  const minutes = minuteOptions(5);
  const days = useMemo(
    () => Array.from({ length: daysInMonth(safe.year, safe.month) }, (_, i) => String(i + 1).padStart(2, '0')),
    [safe.month, safe.year],
  );
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => monthLabelTr(i + 1)), []);
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')), []);
  const minuteLabels = useMemo(() => minutes.map((m) => String(m).padStart(2, '0')), [minutes]);
  const { t } = useTranslation();

  function patch(next: Partial<ReservationSlot>) {
    onChange(clampSlotDay({ ...safe, ...next }));
  }

  const dayIndex = Math.max(0, safe.day - 1);
  const monthIndex = safe.month - 1;
  const yearIndex = Math.max(0, years.indexOf(safe.year));
  const hourIndex = safe.hour;
  const minuteIndex = Math.max(0, minutes.indexOf(safe.minute));

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      {!embedded ? <Text style={styles.title}>{t('rezervasyon.dateFieldTitle')}</Text> : null}
      <Text style={styles.preview}>{formatSlotDateTimeTr(safe)}</Text>

      <View style={styles.row}>
        <View style={styles.dateGroup}>
          <Text style={styles.groupLabel}>{t('rezervasyon.dateFormat')}</Text>
          <View style={styles.wheels}>
            <ReservationWheelColumn
              label={t('rezervasyon.dayWheel')}
              items={days}
              selectedIndex={dayIndex}
              onSelect={(index) => patch({ day: index + 1 })}
              width={52}
            />
            <ReservationWheelColumn
              label={t('rezervasyon.monthWheel')}
              items={months}
              selectedIndex={monthIndex}
              onSelect={(index) => patch({ month: index + 1 })}
              width={72}
            />
            <ReservationWheelColumn
              label={t('rezervasyon.yearWheel')}
              items={years.map(String)}
              selectedIndex={yearIndex}
              onSelect={(index) => patch({ year: years[index] ?? safe.year })}
              width={64}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.timeGroup}>
          <Text style={styles.groupLabel}>{t('rezervasyon.timeFormat')}</Text>
          <View style={styles.wheels}>
            <ReservationWheelColumn
              label={t('rezervasyon.hourWheel')}
              items={hours}
              selectedIndex={hourIndex}
              onSelect={(index) => patch({ hour: index })}
              width={52}
            />
            <Text style={styles.colon}>:</Text>
            <ReservationWheelColumn
              label={t('rezervasyon.minuteWheel')}
              items={minuteLabels}
              selectedIndex={minuteIndex}
              onSelect={(index) => patch({ minute: minutes[index] ?? 0 })}
              width={52}
            />
          </View>
        </View>
      </View>

      <Text style={styles.helper}>{t('rezervasyon.occupiedTimeHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    backgroundColor: ReservationTheme.panel,
    padding: 12,
    gap: 8,
  },
  wrapEmbedded: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
  },
  title: { color: ReservationTheme.text, fontSize: 15, fontWeight: '700' },
  preview: { color: ReservationTheme.accent, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dateGroup: { flex: 1.35 },
  timeGroup: { flex: 1 },
  groupLabel: { color: ReservationTheme.textSoft, fontSize: 11, marginBottom: 6 },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: ReservationTheme.borderSoft,
    marginTop: 22,
  },
  colon: {
    color: ReservationTheme.accent,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 18,
  },
  helper: { color: ReservationTheme.textSoft, fontSize: 11, lineHeight: 15 },
});
