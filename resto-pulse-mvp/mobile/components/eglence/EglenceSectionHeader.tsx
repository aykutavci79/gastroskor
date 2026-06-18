import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { GastroColors } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Tone = 'games' | 'chat';

type Props = {
  title: string;
  tone: Tone;
  hint?: string;
  style?: ViewStyle;
};

const TONE_CONFIG: Record<
  Tone,
  { icon: IconName; accent: string; chipBg: string; bar: string }
> = {
  games: {
    icon: 'today',
    accent: GastroColors.accent,
    chipBg: 'rgba(255, 107, 53, 0.14)',
    bar: GastroColors.accent,
  },
  chat: {
    icon: 'chatbubbles',
    accent: GastroColors.sky,
    chipBg: 'rgba(66, 133, 244, 0.14)',
    bar: GastroColors.sky,
  },
};

export function EglenceSectionHeader({ title, tone, hint, style }: Props) {
  const config = TONE_CONFIG[tone];

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.accentBar, { backgroundColor: config.bar }]} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.iconChip, { backgroundColor: config.chipBg }]}>
            <Ionicons name={config.icon} size={14} color={config.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginTop: 4,
  },
  accentBar: {
    width: 3,
    borderRadius: 999,
    marginVertical: 2,
  },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: GastroColors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  hint: {
    color: GastroColors.muted,
    fontSize: 12,
    lineHeight: 17,
    paddingLeft: 36,
  },
});
