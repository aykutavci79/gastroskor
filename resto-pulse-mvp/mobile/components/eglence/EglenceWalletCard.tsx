import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  balance: number | null;
  loading?: boolean;
  weeklyHint?: number;
  onPress?: () => void;
};

export function EglenceWalletCard({ balance, loading, weeklyHint = 0, onPress }: Props) {
  const display = balance == null ? '—' : balance.toLocaleString('tr-TR');

  const inner = (
    <View style={styles.card}>
      <View style={styles.warmOverlay} />
      <View style={styles.goldOverlay} />
      <View style={styles.content}>
        <View style={styles.top}>
          <View style={styles.labelBlock}>
            <Text style={styles.kicker}>GastroJeton cüzdanı</Text>
            {loading ? (
              <Text style={styles.balance}>…</Text>
            ) : (
              <Text style={styles.balance}>{display}</Text>
            )}
            <Text style={styles.unit}>Jeton</Text>
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="diamond" size={28} color="#FFFFFF" />
          </View>
        </View>
        {weeklyHint > 0 ? (
          <View style={styles.footer}>
            <Ionicons name="trending-up" size={14} color="rgba(255,255,255,0.92)" />
            <Text style={styles.footerText}>+{weeklyHint} bu hafta kazanıldı</Text>
          </View>
        ) : (
          <Text style={styles.footerText}>Biriken jetonlarınla ödül kazan</Text>
        )}
      </View>
    </View>
  );

  if (!onPress) return inner;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.94 }]}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 132,
    backgroundColor: '#FF6B35',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.45)',
  },
  warmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 107, 53, 0.92)',
  },
  goldOverlay: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 183, 3, 0.35)',
  },
  content: {
    padding: 18,
    justifyContent: 'space-between',
    minHeight: 132,
    zIndex: 1,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labelBlock: { gap: 2 },
  kicker: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  balance: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  unit: { color: 'rgba(255,255,255,0.95)', fontSize: 15, fontWeight: '700' },
  coinBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  footerText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
});
