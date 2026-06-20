import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { DmAvatarButton } from '@/components/DmAvatarButton';
import { JetonChip } from '@/components/eglence/JetonChip';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  jetonBalance?: number | null;
  jetonLoading?: boolean;
  onJetonPress?: () => void;
};

export function EglenceHubHeader({ jetonBalance = null, jetonLoading, onJetonPress }: Props) {
  const { colors } = useGastroTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.brandBlock}>
          <View style={styles.titleRow}>
            <Ionicons name="game-controller" size={22} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>Eğlence & Oyun</Text>
          </View>
          <View style={styles.hubRow}>
            <View style={[styles.hubPill, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
              <Text style={[styles.hubLabel, { color: colors.accent }]}>GastroHub</Text>
            </View>
            <Text style={[styles.hubSub, { color: colors.muted }]}>oyun · jeton · market</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <JetonChip balance={jetonBalance} loading={jetonLoading} onPress={onJetonPress} />
          <DmAvatarButton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  brandBlock: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  hubRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  hubPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  hubLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  hubSub: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
});
