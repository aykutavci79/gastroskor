import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ReservationTheme } from '@/constants/reservation-theme';

type Props = {
  step: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ReservationBookSection({ step, title, subtitle, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ReservationTheme.borderSoft,
    backgroundColor: ReservationTheme.panel,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: ReservationTheme.borderSoft,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ReservationTheme.accentGlow,
    borderWidth: 1,
    borderColor: ReservationTheme.border,
  },
  stepText: {
    color: ReservationTheme.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  headerCopy: { flex: 1, gap: 2 },
  title: {
    color: ReservationTheme.text,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: ReservationTheme.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  body: {
    padding: 14,
    gap: 10,
  },
});
