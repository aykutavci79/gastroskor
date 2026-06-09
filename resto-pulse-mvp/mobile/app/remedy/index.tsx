import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { useSession } from '@/context/session-context';
import {
  acceptReviewRemedyOffer,
  listPendingReviewRemedies,
  rejectReviewRemedyOffer,
} from '@/lib/api';
import type { ReviewRemedyPendingItem } from '@/lib/types';

export default function RemedyOffersScreen() {
  const { user } = useSession();
  const [items, setItems] = useState<ReviewRemedyPendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setItems(await listPendingReviewRemedies(user.email));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAccept(item: ReviewRemedyPendingItem) {
    if (!user?.email || !item.offer) return;
    Alert.alert(
      'Telafi teklifi',
      item.accept_disclaimer,
      [
        { text: 'Vazgec', style: 'cancel' },
        {
          text: 'Teklifi kabul et',
          onPress: () => {
            void (async () => {
              setBusyId(item.review_id);
              try {
                const res = await acceptReviewRemedyOffer(item.review_id, user.email);
                Alert.alert('Tamam', res.message);
                await load();
              } catch (err) {
                Alert.alert('Hata', err instanceof Error ? err.message : 'Islem basarisiz');
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ],
    );
  }

  async function onReject(item: ReviewRemedyPendingItem) {
    if (!user?.email) return;
    Alert.alert('Yorumu yayinla', 'Kuponu kabul etmezseniz yorumunuz herkese acik yayinlanir.', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Yorumumu yayinla',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyId(item.review_id);
            try {
              const res = await rejectReviewRemedyOffer(item.review_id, user.email);
              Alert.alert('Yayinlandi', res.message);
              await load();
            } catch (err) {
              Alert.alert('Hata', err instanceof Error ? err.message : 'Islem basarisiz');
            } finally {
              setBusyId(null);
            }
          })();
        },
      },
    ]);
  }

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Telafi teklifleri</Text>
        <Text style={styles.sub}>72 saat icinde yanit vermezseniz yorumunuz otomatik yayinlanir.</Text>
        {loading ? <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 24 }} /> : null}
        {!loading && items.length === 0 ? (
          <Text style={styles.empty}>Bekleyen telafi teklifi yok.</Text>
        ) : null}
        {items.map((item) => (
          <View key={item.review_id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.restaurant_name ?? 'Restoran'} · {item.rating} yildiz
            </Text>
            {item.offer ? (
              <Text style={styles.offer}>
                %{item.offer.discount_percent} indirim · Kod: {item.offer.code}
              </Text>
            ) : null}
            {item.offer?.offer_message ? (
              <Text style={styles.message}>{item.offer.offer_message}</Text>
            ) : null}
            <Text style={styles.disclaimer}>{item.accept_disclaimer}</Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.accept]}
                disabled={busyId === item.review_id}
                onPress={() => void onAccept(item)}>
                <Text style={styles.btnText}>Teklifi kabul et</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.reject]}
                disabled={busyId === item.review_id}
                onPress={() => void onReject(item)}>
                <Text style={styles.rejectText}>Yorumumu yayinla</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  title: { color: GastroColors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: GastroColors.muted, fontSize: 13, lineHeight: 18 },
  empty: { color: GastroColors.muted, marginTop: 16 },
  card: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GastroColors.border,
    backgroundColor: GastroColors.panel,
    padding: 14,
    gap: 8,
  },
  cardTitle: { color: GastroColors.text, fontWeight: '800', fontSize: 15 },
  offer: { color: GastroColors.accent, fontWeight: '700' },
  message: { color: GastroColors.text, fontSize: 13 },
  disclaimer: { color: GastroColors.muted, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  btn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  accept: { backgroundColor: GastroColors.accent },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  reject: { borderWidth: 1, borderColor: GastroColors.border },
  rejectText: { color: GastroColors.text, fontWeight: '700', fontSize: 13 },
});
