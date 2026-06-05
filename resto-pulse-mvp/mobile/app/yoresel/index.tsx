import { useRouter, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { GastroColors } from '@/constants/theme';
import { listRegionalProducts } from '@/lib/api';
import type { RegionalProductItem } from '@/lib/types';

export default function YoreselLezzetlerScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RegionalProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listRegionalProducts({ city: 'Bursa' })
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.kicker}>İç turizm · Bursa</Text>
        <Text style={styles.title}>Yöresel lezzetler</Text>
        <Text style={styles.sub}>
          TÜRKPATENT'te tescilli ürünler. Tıklayınca Google canlı araması açılır — GastroSkor restoran onayı
          vermez.
        </Text>

        {loading ? <ActivityIndicator color={GastroColors.accent} style={{ marginTop: 24 }} /> : null}

        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.slug}
              style={styles.card}
              onPress={() => router.push(`/yoresel/${item.slug}` as Href)}>
              <View style={styles.cardRow}>
                <View style={styles.cardBody}>
                  <Text style={styles.badge}>MAHREÇ</Text>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.region}>{item.region}</Text>
                  <Text style={styles.summary} numberOfLines={3}>
                    {item.summary}
                  </Text>
                  <Text style={styles.meta}>
                    {item.registration_year} · {item.indication_type} · Canlı arama
                  </Text>
                </View>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.thumb} contentFit="cover" />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 32 },
  kicker: {
    color: GastroColors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: { color: GastroColors.text, fontSize: 24, fontWeight: '700', marginTop: 8 },
  sub: { color: GastroColors.muted, marginTop: 8, lineHeight: 20, fontSize: 14 },
  list: { marginTop: 20, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    backgroundColor: GastroColors.panel,
    overflow: 'hidden',
  },
  cardRow: { flexDirection: 'row', alignItems: 'stretch' },
  cardBody: { flex: 1, padding: 16 },
  thumb: {
    width: 96,
    minHeight: 120,
    backgroundColor: GastroColors.input,
  },
  badge: {
    color: GastroColors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardTitle: { color: GastroColors.text, fontSize: 18, fontWeight: '700', marginTop: 6 },
  region: { color: GastroColors.muted, fontSize: 12, marginTop: 2 },
  summary: { color: GastroColors.muted, fontSize: 13, marginTop: 8, lineHeight: 18 },
  meta: { color: GastroColors.gold, fontSize: 12, fontWeight: '600', marginTop: 10 },
});
