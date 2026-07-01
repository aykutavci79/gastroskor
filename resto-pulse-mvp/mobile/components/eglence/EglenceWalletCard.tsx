import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import { SpinningWalletCoin } from '@/components/eglence/SpinningWalletCoin';
import { GASTROCOIN_LABEL, GASTROCOIN_UNIT } from '@/constants/gastrocoin-theme';

type Props = {
  balance: number | null;
  loading?: boolean;
  weeklyHint?: number;
  onPress?: () => void;
  /** Bisect adım 5 — dönen GC ikonu (önce statik kart). */
  animateCoin?: boolean;
};

const COIN_SLOT = 120;
/** SpinningWalletCoin size prop — renderSize ≈ 77px (önceki carousel ile aynı). */
const COIN_SPIN_SIZE = 80;
const CARD_MIN_H = 150;

export function EglenceWalletCard({
  balance,
  loading,
  weeklyHint = 0,
  onPress,
  animateCoin = true,
}: Props) {
  const display = balance == null ? '—' : balance.toLocaleString('tr-TR');

  const content = (
    <View style={styles.content}>
      <View style={styles.labelBlock}>
        <Text style={styles.kicker}>{GASTROCOIN_LABEL} cüzdanı</Text>
        {loading ? (
          <Text style={styles.balance}>…</Text>
        ) : (
          <Text style={styles.balance}>{display}</Text>
        )}
        <Text style={styles.unit}>{GASTROCOIN_UNIT}</Text>
      </View>
      {weeklyHint > 0 ? (
        <View style={styles.footer}>
          <Ionicons name="trending-up" size={14} color="rgba(255,255,255,0.92)" />
          <Text style={styles.footerText}>+{weeklyHint} bu hafta kazanıldı</Text>
        </View>
      ) : (
        <Text style={[styles.footerText, styles.footerTextStatic]}>Biriken coinlerinle ödül kazan</Text>
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.warmOverlay} />
      {onPress ? (
        <HubPressable
          onPress={onPress}
          style={({ pressed }) => [styles.pressLayer, pressed && { opacity: 0.94 }]}>
          {content}
        </HubPressable>
      ) : (
        content
      )}
      <View style={styles.previewDock} pointerEvents="none">
        <View
          style={[styles.goldGlow, { width: COIN_SLOT, height: COIN_SLOT, borderRadius: COIN_SLOT / 2 }]}
        />
        {animateCoin ? <SpinningWalletCoin size={COIN_SPIN_SIZE} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'visible',
    minHeight: CARD_MIN_H,
    backgroundColor: '#FF6B35',
    borderWidth: 1,
    borderColor: 'rgba(255, 183, 3, 0.45)',
  },
  warmOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 53, 0.92)',
    overflow: 'visible',
  },
  pressLayer: {
    zIndex: 1,
  },
  previewDock: {
    position: 'absolute',
    top: 4,
    right: 4,
    zIndex: 10,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: COIN_SLOT,
    height: COIN_SLOT,
    overflow: 'visible',
  },
  goldGlow: {
    position: 'absolute',
    zIndex: 1,
    backgroundColor: 'rgba(255, 183, 3, 0.38)',
  },
  content: {
    padding: 18,
    paddingRight: COIN_SLOT + 22,
    justifyContent: 'space-between',
    minHeight: CARD_MIN_H,
  },
  labelBlock: { gap: 2, maxWidth: '100%', zIndex: 3, flexShrink: 1 },
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
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, maxWidth: '72%' },
  footerText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },
  footerTextStatic: { maxWidth: '100%' },
});
