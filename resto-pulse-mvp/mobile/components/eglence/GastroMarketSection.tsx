import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { HubPressable } from '@/components/eglence/HubPressable';
import {
  HUB_GAME_PLAY_PRODUCTS,
  HUB_MARKET_ITEMS,
  type HubGamePlayProduct,
  type HubMarketItem,
} from '@/constants/eglence-hub';
import { GASTROCOIN_SHORT, GastroCoinTheme } from '@/constants/gastrocoin-theme';
import { useGastroTheme } from '@/context/theme-context';

type Props = {
  jetonBalance: number | null;
  isLoggedIn: boolean;
  onPurchase: (product: HubGamePlayProduct) => void;
  onViewAll?: () => void;
};

function GamePlayRow({
  product,
  isLoggedIn,
  canAfford,
  onPress,
}: {
  product: HubGamePlayProduct;
  isLoggedIn: boolean;
  canAfford: boolean;
  onPress: () => void;
}) {
  const { colors } = useGastroTheme();
  const disabled = isLoggedIn && !canAfford;

  return (
    <View
      style={[
        styles.playRow,
        { backgroundColor: colors.panel, borderColor: colors.border },
      ]}>
      <View style={styles.playLeft}>
        <View style={[styles.playIcon, { backgroundColor: product.iconBg }]}>
          <Ionicons name={product.icon} size={20} color={product.iconColor} />
        </View>
        <View style={styles.playMeta}>
          <View style={styles.playTitleRow}>
            <Text style={[styles.playTitle, { color: colors.text }]}>{product.title}</Text>
            {product.badge ? (
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>{product.badge}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.playDesc, { color: colors.muted }]} numberOfLines={2}>
            {product.description}
          </Text>
        </View>
      </View>
      <View style={styles.playActions}>
        <View style={[styles.costPill, { backgroundColor: GastroCoinTheme.chipBg }]}>
          <Text style={[styles.costText, { color: GastroCoinTheme.coinGold }]}>{product.cost} {GASTROCOIN_SHORT}</Text>
        </View>
        <HubPressable
          disabled={disabled}
          onPress={onPress}
          style={({ pressed }) => [
            styles.playBtn,
            {
              backgroundColor: disabled ? colors.input : colors.accent,
            },
            !disabled && pressed && { opacity: 0.9 },
          ]}>
          <Text style={[styles.playBtnText, { color: disabled ? colors.muted : '#FFFFFF' }]}>
            {disabled ? 'Yetersiz' : 'Hak al'}
          </Text>
        </HubPressable>
      </View>
    </View>
  );
}

function CouponRow({ item }: { item: HubMarketItem }) {
  const { colors } = useGastroTheme();

  return (
    <View
      style={[
        styles.couponRow,
        { backgroundColor: colors.panel, borderColor: colors.border },
      ]}>
      <View style={styles.couponMeta}>
        <Text style={[styles.couponTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.couponDesc, { color: colors.muted }]} numberOfLines={1}>
          {item.description}
        </Text>
      </View>
      <View style={styles.couponActions}>
        <View style={[styles.soonPill, { backgroundColor: colors.input }]}>
          <Text style={[styles.soonText, { color: colors.muted }]}>Yakında</Text>
        </View>
        <View style={[styles.couponBtn, { backgroundColor: colors.input }]}>
          <Text style={[styles.couponBtnText, { color: colors.muted }]}>Kupon al</Text>
        </View>
      </View>
    </View>
  );
}

export function GastroMarketSection({ jetonBalance, isLoggedIn, onPurchase, onViewAll }: Props) {
  const { colors } = useGastroTheme();

  function onTeaserPress() {
    if (onViewAll) {
      onViewAll();
      return;
    }
    Alert.alert('Gastro-Market', 'İndirim kuponları yakında aktif olacak.');
  }

  function onPlayPress(product: HubGamePlayProduct) {
    if (!isLoggedIn) {
      Alert.alert('Giriş gerekli', 'Oyun hakkı almak için Hesap sekmesinden giriş yap.');
      return;
    }
    if (jetonBalance == null || jetonBalance < product.cost) {
      Alert.alert('Yeterli GastroCoin yok', `Bu hak için ${product.cost} ${GASTROCOIN_SHORT} gerekir.`);
      return;
    }
    Alert.alert(
      product.title,
      `${product.cost} ${GASTROCOIN_SHORT} harcanarak oyun hakkı alınacak. Devam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Hak al', onPress: () => onPurchase(product) },
      ],
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Gastro-Market</Text>

      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>Oyun Hakları</Text>
        <Text style={[styles.blockHint, { color: colors.muted }]}>
          {GASTROCOIN_SHORT} ile ekstra tur ve oyun aç
        </Text>
        <View style={styles.list}>
          {HUB_GAME_PLAY_PRODUCTS.map((product) => {
            const canAfford = jetonBalance != null && jetonBalance >= product.cost;
            return (
              <GamePlayRow
                key={product.id}
                product={product}
                isLoggedIn={isLoggedIn}
                canAfford={canAfford}
                onPress={() => onPlayPress(product)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: colors.text }]}>İndirim Kuponları</Text>
        <HubPressable
          onPress={onTeaserPress}
          style={({ pressed }) => [
            styles.teaser,
            { borderColor: colors.border, backgroundColor: colors.panel },
            pressed && { opacity: 0.94 },
          ]}>
          <View style={styles.teaserRow}>
            <View style={[styles.teaserIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="ticket" size={22} color={colors.accent} />
            </View>
            <View style={styles.teaserMeta}>
              <Text style={[styles.teaserKicker, { color: colors.muted }]}>ÖDÜL VİTRİNİ</Text>
              <Text style={[styles.teaserTitle, { color: colors.accent }]}>
                Restoran indirim kuponları
              </Text>
              <Text style={[styles.teaserSoon, { color: colors.muted }]}>Yakında</Text>
            </View>
          </View>
          <Text style={[styles.teaserLink, { color: colors.muted }]}>Tüm ödülleri gör →</Text>
        </HubPressable>

        <View style={styles.list}>
          {HUB_MARKET_ITEMS.slice(0, 2).map((item) => (
            <CouponRow key={item.id} item={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  block: { gap: 8 },
  blockTitle: { fontSize: 15, fontWeight: '800' },
  blockHint: { fontSize: 12, fontWeight: '600', marginTop: -4 },
  list: { gap: 10 },
  playRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  playLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  playIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMeta: { flex: 1, gap: 3 },
  playTitleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  playTitle: { fontSize: 14, fontWeight: '800' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  playDesc: { fontSize: 11, lineHeight: 15 },
  playActions: { alignItems: 'flex-end', gap: 6 },
  costPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  costText: { fontSize: 10, fontWeight: '800' },
  playBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  playBtnText: { fontSize: 11, fontWeight: '800' },
  teaser: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 14,
    gap: 10,
  },
  teaserRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  teaserIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaserMeta: { flex: 1, gap: 4 },
  teaserKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  teaserTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  teaserSoon: { fontSize: 12, fontWeight: '700' },
  teaserLink: { fontSize: 13, fontWeight: '700' },
  couponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  couponMeta: { flex: 1, gap: 2 },
  couponTitle: { fontSize: 14, fontWeight: '800' },
  couponDesc: { fontSize: 12 },
  couponActions: { alignItems: 'flex-end', gap: 6 },
  soonPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  soonText: { fontSize: 10, fontWeight: '800' },
  couponBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, opacity: 0.85 },
  couponBtnText: { fontSize: 11, fontWeight: '800' },
});
