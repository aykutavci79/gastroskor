import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import { GASTROCOIN_UNIT } from '@/constants/gastrocoin-theme';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  balance: number | null;
  loading?: boolean;
  onPress?: () => void;
};

export function JetonChip({ balance, loading, onPress }: Props) {
  const { colors } = useGastroTheme();
  const label = balance == null ? '—' : String(balance);

  const content = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.panel,
          borderColor: colors.border,
        },
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="diamond" size={14} color={colors.gold} />
      )}
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.suffix, { color: colors.muted }]}>{GASTROCOIN_UNIT}</Text>
    </View>
  );

  if (!onPress) return content;

  return (
    <HubPressable onPress={onPress} accessibilityRole="button" accessibilityLabel="GastroCoin bakiyesi">
      {content}
    </HubPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  suffix: {
    fontSize: 11,
    fontWeight: '500',
  },
});
