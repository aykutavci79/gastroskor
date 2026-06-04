import { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { GastroColors } from '@/constants/theme';
import { getRestaurantFollowerCoupon } from '@/lib/api';
import type { FollowerCoupon } from '@/lib/types';

type Props = {
  restaurantId: string;
  userEmail: string | null | undefined;
};

export function FollowerCouponBox({ restaurantId, userEmail }: Props) {
  const [coupon, setCoupon] = useState<FollowerCoupon | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!userEmail?.trim()) {
      setCoupon(null);
      return;
    }
    setLoading(true);
    getRestaurantFollowerCoupon(restaurantId, userEmail)
      .then(setCoupon)
      .catch(() => setCoupon(null))
      .finally(() => setLoading(false));
  }, [restaurantId, userEmail]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userEmail) return null;
  if (loading) {
    return (
      <View style={styles.box}>
        <Text style={styles.muted}>Kupon kontrol ediliyor…</Text>
      </View>
    );
  }
  if (!coupon || coupon.status !== 'issued') return null;

  const expires = new Date(coupon.expires_at).toLocaleDateString('tr-TR');

  function shareCode() {
    void Share.share({
      message: `GastroSkor takipçi kuponum: ${coupon!.code} (%${coupon!.discount_percent} indirim)`,
    });
  }

  return (
    <View style={styles.box}>
      <Text style={styles.badge}>Takipçi kuponu</Text>
      <Text style={styles.title}>{coupon.title ?? 'İndirim'}</Text>
      <Text style={styles.percent}>%{coupon.discount_percent} indirim</Text>
      <Pressable style={styles.codeRow} onPress={shareCode}>
        <Text style={styles.code}>{coupon.code}</Text>
        <Text style={styles.copyHint}>Paylaş</Text>
      </Pressable>
      <Text style={styles.muted}>Son kullanım: {expires} · Kasada bu kodu söyleyin.</Text>
      <Text style={styles.fine}>
        Kod tek kullanımlıktır; restoran panelden onaylayınca kapanır.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GastroColors.gold,
    backgroundColor: 'rgba(255, 183, 3, 0.12)',
    padding: 14,
    gap: 6,
  },
  badge: {
    color: GastroColors.gold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: { color: GastroColors.text, fontSize: 15, fontWeight: '700' },
  percent: { color: GastroColors.accent, fontSize: 18, fontWeight: '800' },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: GastroColors.panel,
  },
  code: { color: GastroColors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  copyHint: { color: GastroColors.accent, fontSize: 12, fontWeight: '700' },
  muted: { color: GastroColors.muted, fontSize: 12 },
  fine: { color: GastroColors.muted, fontSize: 11, lineHeight: 16 },
});
